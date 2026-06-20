from rest_framework import viewsets, permissions
from .models import IoTReading, VehicleIoTReading
from .serializers import IoTReadingSerializer, VehicleIoTReadingSerializer
from apps.notifications.models import Notification
from apps.notifications.services import notify


class IoTReadingViewSet(viewsets.ModelViewSet):
    serializer_class = IoTReadingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                facility_ids = user.cooperative.storage_facilities.values_list('id', flat=True)
                qs = IoTReading.objects.filter(facility_id__in=facility_ids)
            except Exception:
                return IoTReading.objects.none()
        elif user.role == 'WAREHOUSE_MANAGER':
            try:
                facility_ids = user.warehouse_manager_profile.facilities.values_list('id', flat=True)
                qs = IoTReading.objects.filter(facility_id__in=facility_ids)
            except Exception:
                return IoTReading.objects.none()
        elif user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            qs = IoTReading.objects.all()
        else:
            return IoTReading.objects.none()
        facility = self.request.query_params.get('facility')
        if facility:
            qs = qs.filter(facility_id=facility)
        # Return only recent readings by default (last 100)
        return qs[:100]

    def perform_create(self, serializer):
        # IoT devices POST directly; no user ownership needed
        reading = serializer.save()
        if (reading.is_temperature_breach or reading.is_humidity_breach) and not reading.alert_sent:
            facility = reading.facility
            # Notify whoever is currently using the space (cooperative) and whoever owns
            # the hardware (warehouse manager, if this facility is warehouse-manager-owned).
            if facility.cooperative_id:
                notify(
                    facility.cooperative.manager,
                    Notification.NotificationType.STORAGE_ALERT,
                    'Cold Storage Temperature Alert',
                    f'{facility.name}: {reading.temperature_celsius}°C recorded — threshold breached.',
                    related_object_type='iot_reading', related_object_id=reading.id,
                )
            if facility.warehouse_manager_id:
                notify(
                    facility.warehouse_manager.user,
                    Notification.NotificationType.STORAGE_ALERT,
                    'Cold Storage Temperature Alert',
                    f'{facility.name}: {reading.temperature_celsius}°C recorded — threshold breached.',
                    related_object_type='iot_reading', related_object_id=reading.id,
                )
            reading.alert_sent = True
            reading.save(update_fields=['alert_sent'])


class VehicleIoTReadingViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleIoTReadingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TRANSPORTER':
            try:
                qs = VehicleIoTReading.objects.filter(
                    trip__transport_request__transporter=user.transporter_profile
                )
            except Exception:
                return VehicleIoTReading.objects.none()
        elif user.role == 'DISTRIBUTOR':
            try:
                dist = user.distributor_profile
                trip_ids = self._distributor_trip_ids(dist)
                qs = VehicleIoTReading.objects.filter(trip_id__in=trip_ids)
            except Exception:
                return VehicleIoTReading.objects.none()
        elif user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            qs = VehicleIoTReading.objects.all()
        else:
            return VehicleIoTReading.objects.none()
        trip = self.request.query_params.get('trip')
        if trip:
            qs = qs.filter(trip_id=trip)
        return qs

    @staticmethod
    def _distributor_trip_ids(dist):
        """Trips carrying batches this distributor is receiving (leg 1) or sending (leg 2)."""
        from django.db.models import Q
        from apps.transport.models import TransportRequest
        return TransportRequest.objects.filter(
            Q(batch_leg1__received_by_distributor=dist) |
            Q(batch_leg1__supply_agreement__produce_request__distributor=dist) |
            Q(batch_leg2__received_by_distributor=dist) |
            Q(batch_leg2__supply_agreement__produce_request__distributor=dist) |
            Q(requested_by_distributor=dist)
        ).values_list('trip__id', flat=True)

    def perform_create(self, serializer):
        reading = serializer.save()
        if reading.is_breach and not reading.alert_sent:
            req = reading.trip.transport_request
            notify(
                req.transporter.user,
                Notification.NotificationType.COLD_CHAIN_ALERT,
                'Cold Chain Temperature Breach',
                f'{reading.temperature_celsius}°C recorded on Trip #{reading.trip_id} — cargo may be at risk.',
                related_object_type='vehicle_iot_reading', related_object_id=reading.id,
            )
            reading.alert_sent = True
            reading.save(update_fields=['alert_sent'])
