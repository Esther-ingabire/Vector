from rest_framework import serializers
from .models import Transporter, Vehicle, TransportRequest, Trip, GPSTrack


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'vehicle_type', 'plate_number', 'capacity_kg',
                  'operating_districts', 'has_iot_temperature', 'iot_device_id', 'is_active']
        read_only_fields = ['id']


class TransporterSerializer(serializers.ModelSerializer):
    vehicles = VehicleSerializer(many=True, read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = Transporter
        fields = ['id', 'user', 'company_name', 'operating_districts', 'is_active', 'vehicles', 'name']
        read_only_fields = ['id', 'user']

    def get_name(self, obj):
        return str(obj)


class GPSTrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = GPSTrack
        fields = ['id', 'trip', 'latitude', 'longitude', 'speed_kmh', 'timestamp']
        read_only_fields = ['id']


class TripSerializer(serializers.ModelSerializer):
    gps_tracks = GPSTrackSerializer(many=True, read_only=True)
    transit_duration_hours = serializers.FloatField(read_only=True)

    class Meta:
        model = Trip
        fields = ['id', 'transport_request', 'actual_pickup_datetime',
                  'actual_delivery_datetime', 'pickup_confirmed_at',
                  'delivery_confirmed_at', 'delivery_notes', 'created_at',
                  'gps_tracks', 'transit_duration_hours']
        read_only_fields = ['id', 'created_at']


class TransportRequestSerializer(serializers.ModelSerializer):
    trip = TripSerializer(read_only=True)
    transporter_name = serializers.CharField(source='transporter.__str__', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)

    class Meta:
        model = TransportRequest
        fields = ['id', 'requested_by_cooperative', 'requested_by_distributor',
                  'transporter', 'transporter_name', 'vehicle', 'vehicle_plate',
                  'leg_number', 'pickup_location', 'pickup_gps_lat', 'pickup_gps_lng',
                  'destination', 'destination_gps_lat', 'destination_gps_lng',
                  'cargo_description', 'estimated_cargo_weight_kg',
                  'requires_refrigeration', 'required_pickup_datetime',
                  'status', 'decline_reason', 'accepted_at', 'notes',
                  'created_at', 'updated_at', 'trip']
        read_only_fields = ['id', 'accepted_at', 'created_at', 'updated_at']
