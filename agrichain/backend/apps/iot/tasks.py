"""IoT simulation task — generates mock sensor readings for development/demo."""
from celery import shared_task
import random
from django.utils import timezone


@shared_task
def simulate_sensor_readings():
    """
    Generates realistic mock sensor data for all IoT-enabled facilities and active trips.
    Runs every 15 minutes in development. In production, real ESP32 devices POST data.
    """
    from apps.cooperatives.models import ColdStorageFacility
    from apps.iot.models import IoTReading, VehicleIoTReading
    from apps.transport.models import Trip

    now = timezone.now()

    # Cold storage facility readings
    for facility in ColdStorageFacility.objects.filter(has_iot_sensor=True, is_active=True):
        base_temp = 8.0
        temp = base_temp + random.gauss(0, 2.0)
        humidity = 75.0 + random.gauss(0, 5.0)
        IoTReading.objects.create(
            facility=facility,
            temperature_celsius=round(temp, 1),
            humidity_percent=round(humidity, 1),
            timestamp=now,
        )

    # Active refrigerated vehicle readings
    active_trips = Trip.objects.filter(
        delivery_confirmed_at__isnull=True,
        transport_request__vehicle__has_iot_temperature=True
    ).select_related("transport_request__vehicle")

    for trip in active_trips:
        base_temp = 6.0
        temp = base_temp + random.gauss(0, 2.5)
        VehicleIoTReading.objects.create(
            trip=trip,
            temperature_celsius=round(temp, 1),
            timestamp=now,
        )

    return f"Simulated IoT readings at {now.strftime(\'%H:%M\')}"
