from rest_framework import serializers
from .models import Crop, Cooperative, CooperativeStock, ColdStorageFacility


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = ['id', 'name', 'category', 'requires_cold_chain',
                  'safe_transit_hours_amber', 'safe_transit_hours_red',
                  'safe_temp_max_amber', 'safe_temp_max_red',
                  'safe_storage_days_amber', 'safe_storage_days_red', 'is_active']


class CooperativeStockSerializer(serializers.ModelSerializer):
    crop_name = serializers.CharField(source='crop.name', read_only=True)

    class Meta:
        model = CooperativeStock
        fields = ['id', 'crop', 'crop_name', 'quantity_kg', 'quality_grade',
                  'harvest_date', 'available_from', 'notes', 'is_available',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ColdStorageFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ColdStorageFacility
        fields = ['id', 'name', 'capacity_kg', 'location_description',
                  'has_iot_sensor', 'sensor_device_id',
                  'temp_threshold_amber_celsius', 'temp_threshold_red_celsius',
                  'humidity_threshold_percent', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class CooperativeSerializer(serializers.ModelSerializer):
    stock_records = CooperativeStockSerializer(many=True, read_only=True)
    storage_facilities = ColdStorageFacilitySerializer(many=True, read_only=True)
    crops_specialised = CropSerializer(many=True, read_only=True)
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Cooperative
        fields = ['id', 'name', 'registration_number', 'district', 'sector',
                  'description', 'gps_latitude', 'gps_longitude', 'crops_specialised',
                  'contact_phone', 'contact_email', 'reliability_score',
                  'on_time_dispatch_rate', 'quality_consistency_rate', 'response_rate',
                  'total_batches_dispatched', 'is_active', 'created_at',
                  'stock_records', 'storage_facilities', 'manager_name']
        read_only_fields = ['id', 'reliability_score', 'on_time_dispatch_rate',
                            'quality_consistency_rate', 'response_rate',
                            'total_batches_dispatched', 'created_at']

    def get_manager_name(self, obj):
        return obj.manager.get_full_name()


class CooperativeDirectorySerializer(serializers.ModelSerializer):
    crops_specialised = serializers.StringRelatedField(many=True)
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Cooperative
        fields = ['id', 'name', 'district', 'crops_specialised', 'reliability_score',
                  'contact_phone', 'contact_email', 'gps_latitude', 'gps_longitude',
                  'manager_name']

    def get_manager_name(self, obj):
        return obj.manager.get_full_name()
