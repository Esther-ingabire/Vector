import qrcode
import io
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Batch, QRCodeScanEvent
from .serializers import BatchSerializer, BatchListSerializer, QRCodeScanEventSerializer


class BatchViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return Batch.objects.filter(cooperative=user.cooperative)
            except Exception:
                return Batch.objects.none()
        if user.role == 'DISTRIBUTOR':
            try:
                dist = user.distributor_profile
                # Include both received batches and in-transit batches destined for this distributor
                return Batch.objects.filter(
                    Q(received_by_distributor=dist) |
                    Q(supply_agreement__produce_request__distributor=dist)
                ).distinct()
            except Exception:
                return Batch.objects.none()
        if user.role in ('TRANSPORTER', 'TRANSPORT_COMPANY'):
            try:
                transporter = user.transporter_profile
                return (
                    Batch.objects.filter(transport_request_leg1__transporter=transporter) |
                    Batch.objects.filter(transport_request_leg2__transporter=transporter)
                ).distinct()
            except Exception:
                return Batch.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return Batch.objects.all()
        return Batch.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return BatchListSerializer
        return BatchSerializer

    def perform_create(self, serializer):
        serializer.save(
            dispatched_by=self.request.user,
            cooperative=self.request.user.cooperative,
        )

    @action(detail=True, methods=['get'])
    def qr(self, request, pk=None):
        batch = self.get_object()
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(str(batch.batch_id))
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return HttpResponse(buf, content_type='image/png')

    @action(detail=True, methods=['post'])
    def scan(self, request, pk=None):
        batch = self.get_object()
        scan_point = request.data.get('scan_point')
        if not scan_point:
            return Response({'detail': 'scan_point is required.'}, status=status.HTTP_400_BAD_REQUEST)
        scan = QRCodeScanEvent.objects.create(
            batch=batch,
            scan_point=scan_point,
            scanned_by=request.user,
            gps_latitude=request.data.get('gps_latitude'),
            gps_longitude=request.data.get('gps_longitude'),
        )
        return Response(QRCodeScanEventSerializer(scan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def iot(self, request, pk=None):
        """Combined GPS + vehicle temperature readings for this batch's trip(s) —
        powers the live vehicle monitoring view for cooperatives/distributors/transporters."""
        batch = self.get_object()
        from apps.iot.models import VehicleIoTReading
        from apps.iot.serializers import VehicleIoTReadingSerializer
        from apps.transport.models import GPSTrack
        from apps.transport.serializers import GPSTrackSerializer

        trip_ids = []
        active_request = None
        latest_request = None
        for req in (batch.transport_request_leg1, batch.transport_request_leg2):
            if req and hasattr(req, 'trip'):
                trip_ids.append(req.trip.id)
                latest_request = req  # leg2 (if present) wins as the most relevant leg
                if not req.trip.delivery_confirmed_at:
                    active_request = req

        readings = VehicleIoTReading.objects.filter(trip_id__in=trip_ids).order_by('-timestamp')[:50]
        gps = GPSTrack.objects.filter(trip_id__in=trip_ids).order_by('timestamp')[:200]
        # Show the route even after delivery — a completed journey, not just an in-progress
        # one — so Traceability always has a real map instead of falling back to text only.
        route_request = active_request or latest_request
        route = None
        if route_request:
            route = {
                'pickup_location': route_request.pickup_location,
                'pickup_gps_lat': route_request.pickup_gps_lat,
                'pickup_gps_lng': route_request.pickup_gps_lng,
                'destination': route_request.destination,
                'destination_gps_lat': route_request.destination_gps_lat,
                'destination_gps_lng': route_request.destination_gps_lng,
                'delivered': route_request is not active_request,
            }
        return Response({
            'temperature_readings': VehicleIoTReadingSerializer(readings, many=True).data,
            'gps_tracks': GPSTrackSerializer(gps, many=True).data,
            'route': route,
            'is_live': active_request is not None,
        })

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        batch_id = request.query_params.get('batch_id')
        if not batch_id:
            return Response({'detail': 'batch_id query param required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            batch = Batch.objects.get(batch_id=batch_id)
            return Response(BatchSerializer(batch).data)
        except Batch.DoesNotExist:
            return Response({'detail': 'Batch not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='confirm-receipt')
    def confirm_receipt(self, request, pk=None):
        """
        Distributor confirms receipt of a batch at their warehouse.
        Records received weight, quality grade, and logs the QR scan event.
        Computes transit loss (leg 1) automatically.
        """
        batch = self.get_object()

        received_qty = request.data.get('received_qty_kg')
        quality = request.data.get('quality_grade_received', '')
        notes = request.data.get('notes', '')

        # Allow re-confirmation (idempotent)
        try:
            dist = request.user.distributor_profile
        except Exception:
            dist = None

        if received_qty is not None:
            batch.weight_at_distributor_kg = received_qty
        batch.quality_at_distributor = quality
        batch.received_by_distributor = dist
        batch.distributor_receipt_timestamp = timezone.now()
        batch.current_status = Batch.Status.AT_DISTRIBUTOR

        # Compute transit loss (dispatch weight vs received weight)
        batch.calculate_transit_loss_leg1()
        batch.calculate_total_loss()
        batch.save()

        # Record the handover scan event
        QRCodeScanEvent.objects.get_or_create(
            batch=batch,
            scan_point=QRCodeScanEvent.ScanPoint.DISTRIBUTOR_RECEIPT,
            defaults={'scanned_by': request.user},
        )

        # ── Shortfall notification to cooperative ───────────────────────────
        # If the distributor flagged that items were never dispatched (as opposed to
        # lost in transit), notify the cooperative immediately with the specific details
        # so they can investigate and respond.
        shortfall_type = request.data.get('shortfall_type')
        loss_reason    = request.data.get('loss_reason', '')
        loss_kg        = float(batch.transit_loss_leg1_kg or 0)

        if shortfall_type == 'NOT_DISPATCHED' and loss_kg > 0 and batch.cooperative:
            from apps.notifications.services import notify
            from apps.notifications.models import Notification
            crop_name   = batch.crop.name if batch.crop else 'produce'
            dist_name   = str(dist) if dist else 'Distributor'
            reason_code = loss_reason.replace('NOT_DISPATCHED:', '').strip().split('—')[0].strip()
            notify(
                batch.cooperative.manager,
                Notification.NotificationType.BATCH_DELIVERED,
                f'Shortfall Report — Batch {str(batch.batch_id)[:8].upper()}',
                f'{dist_name} confirmed receipt of Batch {str(batch.batch_id)[:8].upper()} '
                f'but reports {loss_kg:,.0f} kg of {crop_name} were NOT dispatched from your cooperative. '
                f'Reason given: {reason_code}. '
                f'Expected: {float(batch.dispatch_weight_kg):,.0f} kg | Received: {float(batch.weight_at_distributor_kg or 0):,.0f} kg. '
                f'Please review and confirm whether this quantity was dispatched.',
                related_object_type='batch', related_object_id=batch.id,
            )

        return Response(BatchSerializer(batch).data)


class QRCodeScanEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QRCodeScanEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            return QRCodeScanEvent.objects.filter(batch_id=batch_id)
        return QRCodeScanEvent.objects.all()
