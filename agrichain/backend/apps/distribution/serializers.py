from rest_framework import serializers
from .models import Distributor, ProduceRequest, SupplyAgreement, CollectionNotice, Order


class DistributorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Distributor
        fields = ['id', 'user', 'company_name', 'warehouse_location', 'warehouse_gps_lat',
                  'warehouse_gps_lng', 'district', 'contact_phone', 'is_active', 'name']
        read_only_fields = ['id', 'user']

    def get_name(self, obj):
        return str(obj)


class ProduceRequestSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True)
    crop_name = serializers.CharField(source='crop.name', read_only=True)
    distributor_name = serializers.SerializerMethodField()

    class Meta:
        model = ProduceRequest
        fields = ['id', 'distributor', 'distributor_name', 'cooperative', 'cooperative_name',
                  'crop', 'crop_name', 'quantity_kg', 'quality_grade_required',
                  'required_delivery_date', 'additional_notes', 'status',
                  'cooperative_response_notes', 'responded_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'distributor', 'responded_at', 'created_at', 'updated_at']

    def get_distributor_name(self, obj):
        return str(obj.distributor)


class SupplyAgreementSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplyAgreement
        fields = ['id', 'produce_request', 'agreed_quantity_kg', 'agreed_quality_grade',
                  'agreed_delivery_date', 'created_at']
        read_only_fields = ['id', 'created_at']


class CollectionNoticeSerializer(serializers.ModelSerializer):
    crop_name = serializers.CharField(source='crop.name', read_only=True)
    distributor_name = serializers.SerializerMethodField()

    class Meta:
        model = CollectionNotice
        fields = ['id', 'distributor', 'distributor_name', 'crop', 'crop_name',
                  'available_quantity_kg', 'collection_deadline', 'pickup_location',
                  'pickup_gps_lat', 'pickup_gps_lng', 'notes', 'is_active',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'distributor', 'created_at', 'updated_at']

    def get_distributor_name(self, obj):
        return str(obj.distributor)


class OrderSerializer(serializers.ModelSerializer):
    market_agent_name = serializers.SerializerMethodField()
    distributor_name = serializers.SerializerMethodField()
    crop_name = serializers.CharField(source='collection_notice.crop.name', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'collection_notice', 'market_agent', 'market_agent_name',
                  'distributor', 'distributor_name', 'crop_name',
                  'quantity_requested_kg', 'preferred_collection_date',
                  'confirmed_quantity_kg', 'adjustment_reason',
                  'delivery_method', 'transporter', 'status',
                  'created_at', 'confirmed_at', 'updated_at']
        read_only_fields = ['id', 'distributor', 'confirmed_at', 'created_at', 'updated_at']

    def get_market_agent_name(self, obj):
        return str(obj.market_agent)

    def get_distributor_name(self, obj):
        return str(obj.distributor)
