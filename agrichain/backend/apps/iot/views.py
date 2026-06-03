from rest_framework import viewsets, permissions
from .models import IoTReading, VehicleIoTReading
from .serializers import IoTReadingSerializer, VehicleIoTReadingSerializer


class IoTReadingViewSet(viewsets.ModelViewSet):
    serializer_class = IoTReadingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = IoTReading.objects.all()
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                facility_ids = user.cooperative.storage_facilities.values_list('id', flat=True)
                qs = qs.filter(facility_id__in=facility_ids)
            except Exception:
                return IoTReading.objects.none()
        facility = self.request.query_params.get('facility')
        if facility:
            qs = qs.filter(facility_id=facility)
        # Return only recent readings by default (last 100)
        return qs[:100]

    def perform_create(self, serializer):
        # IoT devices POST directly; no user ownership needed
        serializer.save()


class VehicleIoTReadingViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleIoTReadingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'TRANSPORTER':
            try:
                return VehicleIoTReading.objects.filter(
                    trip__transport_request__transporter=user.transporter_profile
                )
            except Exception:
                return VehicleIoTReading.objects.none()
        return VehicleIoTReading.objects.all()
