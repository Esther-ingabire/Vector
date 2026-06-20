from rest_framework import serializers
from .models import Crop, Cooperative, CooperativeStock, ColdStorageFacility, WarehouseManager, WarehouseRentalRequest


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
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True, default=None)
    warehouse_manager_name = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = ColdStorageFacility
        fields = ['id', 'cooperative', 'cooperative_name', 'warehouse_manager', 'warehouse_manager_name',
                  'name', 'capacity_kg', 'location_description', 'gps_latitude', 'gps_longitude',
                  'has_iot_sensor', 'sensor_device_id',
                  'is_available_for_rent', 'rental_price_per_month',
                  'temp_threshold_amber_celsius', 'temp_threshold_red_celsius',
                  'humidity_threshold_percent', 'is_active', 'created_at', 'distance_km']
        read_only_fields = ['id', 'cooperative', 'warehouse_manager', 'created_at']

    def get_warehouse_manager_name(self, obj):
        return str(obj.warehouse_manager) if obj.warehouse_manager_id else None

    def get_distance_km(self, obj):
        return getattr(obj, 'distance_km', None)


class WarehouseManagerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    facilities = ColdStorageFacilitySerializer(many=True, read_only=True)

    class Meta:
        model = WarehouseManager
        fields = ['id', 'user', 'company_name', 'district', 'contact_phone', 'is_active', 'name', 'facilities']
        read_only_fields = ['id', 'user']

    def get_name(self, obj):
        return str(obj)


class WarehouseRentalRequestSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    warehouse_manager_name = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseRentalRequest
        fields = ['id', 'cooperative', 'cooperative_name', 'facility', 'facility_name',
                  'warehouse_manager_name', 'requested_capacity_kg', 'notes',
                  'status', 'decline_reason', 'responded_at', 'created_at']
        read_only_fields = ['id', 'cooperative', 'status', 'decline_reason', 'responded_at', 'created_at']

    def get_warehouse_manager_name(self, obj):
        return str(obj.facility.warehouse_manager) if obj.facility.warehouse_manager_id else None


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
    composite_score = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Cooperative
        fields = ['id', 'name', 'district', 'sector', 'description', 'crops_specialised',
                  'reliability_score', 'on_time_dispatch_rate', 'quality_consistency_rate',
                  'response_rate', 'total_batches_dispatched',
                  'contact_phone', 'contact_email', 'gps_latitude', 'gps_longitude',
                  'manager_name', 'composite_score', 'distance_km']

    def get_distance_km(self, obj):
        return getattr(obj, 'distance_km', None)

    def get_manager_name(self, obj):
        return obj.manager.get_full_name()

    def get_composite_score(self, obj):
        score = (
            float(obj.reliability_score or 0) * 0.35 +
            float(obj.quality_consistency_rate or 0) * 0.35 +
            float(obj.response_rate or 0) * 0.20 +
            float(obj.on_time_dispatch_rate or 0) * 0.10
        )
        return round(score, 2)
