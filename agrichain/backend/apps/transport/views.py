from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Transporter, Vehicle, TransportRequest, Trip, GPSTrack
from .serializers import (
    TransporterSerializer, VehicleSerializer,
    TransportRequestSerializer, TripSerializer, GPSTrackSerializer,
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

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TRANSPORTER':
            try:
                return Trip.objects.filter(transport_request__transporter=user.transporter_profile)
            except Transporter.DoesNotExist:
                return Trip.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return Trip.objects.all()
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
