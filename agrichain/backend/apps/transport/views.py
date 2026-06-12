from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Transporter, Vehicle, TransportRequest, Trip, GPSTrack
from .serializers import (
    TransporterSerializer, VehicleSerializer,
    TransportRequestSerializer, TripSerializer, TripListSerializer, GPSTrackSerializer,
)
from apps.authentication.permissions import IsTransporter


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
                serializer.save(requested_by_cooperative=user.cooperative)
            except Exception:
                serializer.save()
        elif user.role == 'DISTRIBUTOR':
            try:
                serializer.save(requested_by_distributor=user.distributor_profile)
            except Exception:
                serializer.save()
        else:
            serializer.save()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TRANSPORTER':
            try:
                return TransportRequest.objects.filter(transporter=user.transporter_profile)
            except Transporter.DoesNotExist:
                return TransportRequest.objects.none()
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return TransportRequest.objects.filter(requested_by_cooperative=user.cooperative)
            except Exception:
                return TransportRequest.objects.none()
        if user.role == 'DISTRIBUTOR':
            try:
                return TransportRequest.objects.filter(requested_by_distributor=user.distributor_profile)
            except Exception:
                return TransportRequest.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return TransportRequest.objects.all()
        return TransportRequest.objects.none()

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter])
    def accept(self, request, pk=None):
        req = self.get_object()
        if req.status != TransportRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = TransportRequest.Status.ACCEPTED
        req.accepted_at = timezone.now()
        req.save()
        Trip.objects.create(transport_request=req)
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
            transport_request__status=TransportRequest.Status.IN_PROGRESS,
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
