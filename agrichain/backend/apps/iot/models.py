"""
IoT models: Cold storage sensor readings, vehicle temperature readings.
Data ingested from ESP32 devices via HTTP POST or MQTT.
"""

from django.db import models
from django.utils import timezone


class IoTReading(models.Model):
    """
    Temperature and humidity reading from a cold storage facility ESP32 sensor.
    Readings expected every 15 minutes.
    """

    facility          = models.ForeignKey('cooperatives.ColdStorageFacility', on_delete=models.CASCADE,
                                          related_name='iot_readings')
    temperature_celsius = models.FloatField()
    humidity_percent    = models.FloatField(null=True, blank=True)
    # Defaults to the moment the server receives the reading — lets a device without an
    # RTC/NTP clock (e.g. a bare ESP32 with no internet time sync) omit this field entirely.
    timestamp           = models.DateTimeField(db_index=True, default=timezone.now)

    # Breach flags — set automatically on save
    is_temperature_breach = models.BooleanField(default=False)
    is_humidity_breach    = models.BooleanField(default=False)

    # Alert sent flag — prevents duplicate alerts
    alert_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [models.Index(fields=['facility', 'timestamp'])]

    def save(self, *args, **kwargs):
        # Auto-flag breaches against facility thresholds
        self.is_temperature_breach = (
            self.temperature_celsius > self.facility.temp_threshold_amber_celsius
        )
        self.is_humidity_breach = (
            self.humidity_percent is not None and
            self.humidity_percent > self.facility.humidity_threshold_percent
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.facility.name}: {self.temperature_celsius}°C at {self.timestamp}"


class VehicleIoTReading(models.Model):
    """
    Temperature reading from a refrigerated vehicle during an active trip.
    Linked to the Trip record so it can be attached to batch traceability records.
    """

    trip                = models.ForeignKey('transport.Trip', on_delete=models.CASCADE, related_name='iot_readings')
    temperature_celsius = models.FloatField()
    timestamp           = models.DateTimeField(db_index=True, default=timezone.now)
    is_breach           = models.BooleanField(default=False)
    alert_sent          = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']
        indexes = [models.Index(fields=['trip', 'timestamp'])]

    def __str__(self):
        return f"Vehicle IoT: {self.temperature_celsius}°C on Trip #{self.trip_id}"

    def _cargo_crop(self):
        req = self.trip.transport_request
        batch = req.batch_leg1.first() or req.batch_leg2.first()
        return batch.crop if batch else None

    def save(self, *args, **kwargs):
        # Auto-flag breach against the transported crop's cold-chain threshold,
        # falling back to a generic 8°C amber limit if the cargo's crop isn't resolvable yet.
        crop = self._cargo_crop()
        threshold = (crop.safe_temp_max_amber if crop and crop.safe_temp_max_amber is not None else 8.0)
        self.is_breach = self.temperature_celsius > threshold
        super().save(*args, **kwargs)
