from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Transporter, Vehicle, TransportRequest, Trip, GPSTrack, IncidentReport
from .serializers import (
    TransporterSerializer, VehicleSerializer,
    TransportRequestSerializer, TripSerializer, TripListSerializer, GPSTrackSerializer,
    IncidentReportSerializer,
)
from apps.authentication.permissions import IsTransporter
from apps.notifications.models import Notification
from apps.notifications.services import notify


def _requester_user(req):
    """The user who should be notified about this TransportRequest's progress."""
    if req.requested_by_cooperative_id:
        return req.requested_by_cooperative.manager
    if req.requested_by_distributor_id:
        return req.requested_by_distributor.user
    return None


class TransporterViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransporterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TRANSPORTER':
            return Transporter.objects.filter(user=user)
        return Transporter.objects.filter(is_active=True)

    @action(detail=False, methods=['get'], permission_classes=[IsTransporter])
    def my(self, request):
        try:
            t = request.user.transporter_profile
            return Response(TransporterSerializer(t).data)
        except Transporter.DoesNotExist:
            return Response({'detail': 'No transporter profile found.'}, status=status.HTTP_404_NOT_FOUND)


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TRANSPORTER':
            try:
                return Vehicle.objects.filter(transporter=user.transporter_profile)
            except Transporter.DoesNotExist:
                return Vehicle.objects.none()
        return Vehicle.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(transporter=self.request.user.transporter_profile)


class TransportRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TransportRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                req = serializer.save(requested_by_cooperative=user.cooperative)
            except Exception:
                req = serializer.save()
        elif user.role == 'DISTRIBUTOR':
            try:
                req = serializer.save(requested_by_distributor=user.distributor_profile)
            except Exception:
                req = serializer.save()
        else:
            req = serializer.save()
        notify(
            req.transporter.user,
            Notification.NotificationType.TRANSPORT_REQUEST_RECEIVED,
            'New Transport Request',
            f'New pickup requested at {req.pickup_location} for {req.cargo_description}.',
            related_object_type='transport_request', related_object_id=req.id,
        )

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status')

        if user.role == 'TRANSPORTER':
            try:
                qs = TransportRequest.objects.filter(transporter=user.transporter_profile)
            except Transporter.DoesNotExist:
                return TransportRequest.objects.none()
        elif user.role == 'COOPERATIVE_MANAGER':
            try:
                qs = TransportRequest.objects.filter(requested_by_cooperative=user.cooperative)
            except Exception:
                return TransportRequest.objects.none()
        elif user.role == 'DISTRIBUTOR':
            try:
                qs = TransportRequest.objects.filter(requested_by_distributor=user.distributor_profile)
            except Exception:
                return TransportRequest.objects.none()
        elif user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            qs = TransportRequest.objects.all()
        else:
            return TransportRequest.objects.none()

        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter])
    def accept(self, request, pk=None):
        req = self.get_object()
        if req.status != TransportRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = TransportRequest.Status.ACCEPTED
        req.accepted_at = timezone.now()
        req.save()
        Trip.objects.create(transport_request=req)
        notify(
            _requester_user(req),
            Notification.NotificationType.TRANSPORT_ACCEPTED,
            'Transport Request Accepted',
            f'{req.transporter} accepted the pickup at {req.pickup_location}.',
            related_object_type='transport_request', related_object_id=req.id,
        )
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter])
    def decline(self, request, pk=None):
        req = self.get_object()
        if req.status != TransportRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = request.data.get('reason', '')
        req.status = TransportRequest.Status.DECLINED
        req.decline_reason = reason
        req.save()
        return Response(TransportRequestSerializer(req).data)


class TripViewSet(viewsets.ModelViewSet):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return TripListSerializer
        return TripSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Trip.objects.select_related('transport_request')
        if user.role == 'TRANSPORTER':
            try:
                return qs.filter(transport_request__transporter=user.transporter_profile)
            except Transporter.DoesNotExist:
                return Trip.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return qs.all()
        return Trip.objects.none()

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter])
    def confirm_pickup(self, request, pk=None):
        trip = self.get_object()
        trip.actual_pickup_datetime = timezone.now()
        trip.pickup_confirmed_at = timezone.now()
        trip.transport_request.status = TransportRequest.Status.IN_PROGRESS
        trip.transport_request.save()
        trip.save()
        req = trip.transport_request
        if req.requested_by_distributor_id:
            notify(
                req.requested_by_distributor.user,
                Notification.NotificationType.BATCH_IN_TRANSIT,
                'Batch Is Now In Transit',
                f'{req.transporter} picked up cargo from {req.pickup_location}.',
                related_object_type='trip', related_object_id=trip.id,
            )
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter])
    def confirm_delivery(self, request, pk=None):
        trip = self.get_object()
        trip.actual_delivery_datetime = timezone.now()
        trip.delivery_confirmed_at = timezone.now()
        trip.delivery_notes = request.data.get('notes', '')
        trip.transport_request.status = TransportRequest.Status.COMPLETED
        trip.transport_request.save()
        trip.save()
        req = trip.transport_request
        if req.requested_by_cooperative_id:
            notify(
                req.requested_by_cooperative.manager,
                Notification.NotificationType.DELIVERY_CONFIRMED,
                'Batch Delivered to Distributor',
                f'{req.transporter} delivered cargo to {req.destination}.',
                related_object_type='trip', related_object_id=trip.id,
            )
        elif req.requested_by_distributor_id:
            notify(
                req.requested_by_distributor.user,
                Notification.NotificationType.BATCH_DELIVERED,
                'Batch Arrived — Confirm Receipt',
                f'{req.transporter} delivered cargo to {req.destination}.',
                related_object_type='trip', related_object_id=trip.id,
            )
        return Response(TripSerializer(trip).data)

    @action(detail=False, methods=['get'], permission_classes=[IsTransporter])
    def active(self, request):
        """Return the current in-progress trip with full request context."""
        try:
            t = request.user.transporter_profile
        except Exception:
            return Response({'detail': 'No transporter profile.'}, status=status.HTTP_404_NOT_FOUND)
        trip = Trip.objects.select_related(
            'transport_request__requested_by_cooperative',
            'transport_request__requested_by_distributor',
            'transport_request__vehicle',
        ).prefetch_related('gps_tracks').filter(
            transport_request__transporter=t,
            transport_request__status__in=[
                TransportRequest.Status.ACCEPTED,
                TransportRequest.Status.IN_PROGRESS,
            ],
        ).order_by('-created_at').first()
        if not trip:
            return Response({'detail': 'No active trip.'}, status=status.HTTP_404_NOT_FOUND)
        data = TripSerializer(trip).data
        req = trip.transport_request
        data['request'] = {
            'id': req.id,
            'pickup_location': req.pickup_location,
            'pickup_gps_lat': str(req.pickup_gps_lat) if req.pickup_gps_lat else None,
            'pickup_gps_lng': str(req.pickup_gps_lng) if req.pickup_gps_lng else None,
            'destination': req.destination,
            'destination_gps_lat': str(req.destination_gps_lat) if req.destination_gps_lat else None,
            'destination_gps_lng': str(req.destination_gps_lng) if req.destination_gps_lng else None,
            'cargo_description': req.cargo_description,
            'estimated_cargo_weight_kg': str(req.estimated_cargo_weight_kg),
            'requires_refrigeration': req.requires_refrigeration,
            'required_pickup_datetime': req.required_pickup_datetime,
            'requester_type': 'Cooperative' if req.requested_by_cooperative_id else 'Distributor',
            'requester_name': req.requested_by_cooperative.name if req.requested_by_cooperative else str(req.requested_by_distributor or '—'),
            'leg_number': req.leg_number,
            'status': req.status,
        }
        return Response(data)


class GPSTrackViewSet(viewsets.ModelViewSet):
    serializer_class = GPSTrackSerializer
    permission_classes = [IsTransporter]

    def get_queryset(self):
        try:
            return GPSTrack.objects.filter(
                trip__transport_request__transporter=self.request.user.transporter_profile
            )
        except Exception:
            return GPSTrack.objects.none()


class IncidentReportViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TRANSPORTER':
            try:
                return IncidentReport.objects.filter(
                    trip__transport_request__transporter=user.transporter_profile
                )
            except Exception:
                return IncidentReport.objects.none()
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return IncidentReport.objects.filter(
                    trip__transport_request__requested_by_cooperative=user.cooperative
                )
            except Exception:
                return IncidentReport.objects.none()
        if user.role == 'DISTRIBUTOR':
            try:
                return IncidentReport.objects.filter(
                    trip__transport_request__requested_by_distributor=user.distributor_profile
                )
            except Exception:
                return IncidentReport.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return IncidentReport.objects.all()
        return IncidentReport.objects.none()

    def perform_create(self, serializer):
        incident = serializer.save()
        req = incident.trip.transport_request
        notify(
            _requester_user(req),
            Notification.NotificationType.INCIDENT_REPORTED,
            f'Transporter Reported: {incident.get_incident_type_display()}',
            f'{req.transporter} reported "{incident.get_incident_type_display()}" on the trip to {req.destination}. {incident.description}'.strip(),
            related_object_type='incident_report', related_object_id=incident.id,
        )
