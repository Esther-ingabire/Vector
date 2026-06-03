from rest_framework import serializers
from .models import IoTReading, VehicleIoTReading


class IoTReadingSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = IoTReading
        fields = ['id', 'facility', 'facility_name', 'temperature_celsius',
                  'humidity_percent', 'timestamp', 'is_temperature_breach',
                  'is_humidity_breach', 'alert_sent', 'created_at']
        read_only_fields = ['id', 'is_temperature_breach', 'is_humidity_breach',
                            'alert_sent', 'created_at']


class VehicleIoTReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleIoTReading
        fields = ['id', 'trip', 'temperature_celsius', 'timestamp',
                  'is_breach', 'alert_sent']
        read_only_fields = ['id', 'is_breach', 'alert_sent']
