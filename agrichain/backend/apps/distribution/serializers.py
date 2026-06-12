from rest_framework import serializers
from .models import Distributor, ProduceRequest, SupplyAgreement, CollectionNotice, Order


def _resolve_crop(name):
    """Get or create a Crop by name. Returns the crop PK."""
    from apps.cooperatives.models import Crop
    name = str(name).strip()
    try:
        return Crop.objects.get(name__iexact=name).pk
    except Crop.DoesNotExist:
        obj = Crop.objects.create(
            name=name.title(),
            category='DRY_GOODS',
            safe_transit_hours_amber=24,
            safe_transit_hours_red=48,
            safe_storage_days_amber=30,
            safe_storage_days_red=60,
        )
        return obj.pk


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

    def to_internal_value(self, data):
        # Mutable copy
        data = dict(data.lists() if hasattr(data, 'lists') else data.items())
        data = {k: (v[0] if isinstance(v, list) and len(v) == 1 else v) for k, v in data.items()}

        # Accept crop by name if crop FK not provided
        if 'crop_name' in data and 'crop' not in data:
            data['crop'] = _resolve_crop(data.pop('crop_name'))
        else:
            data.pop('crop_name', None)

        return super().to_internal_value(data)


class SupplyAgreementSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplyAgreement
        fields = ['id', 'produce_request', 'agreed_quantity_kg', 'agreed_quality_grade',
                  'agreed_delivery_date', 'created_at']
        read_only_fields = ['id', 'created_at']


class CollectionNoticeSerializer(serializers.ModelSerializer):
    crop_name = serializers.CharField(source='crop.name', read_only=True)
    distributor_name = serializers.SerializerMethodField()
    orders_count = serializers.SerializerMethodField()

    class Meta:
        model = CollectionNotice
        fields = ['id', 'distributor', 'distributor_name', 'crop', 'crop_name',
                  'available_quantity_kg', 'collection_deadline', 'pickup_location',
                  'pickup_gps_lat', 'pickup_gps_lng', 'notes', 'is_active', 'orders_count',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'distributor', 'created_at', 'updated_at']

    def get_distributor_name(self, obj):
        return str(obj.distributor)

    def get_orders_count(self, obj):
        return obj.orders.count()

    def to_internal_value(self, data):
        data = dict(data.lists() if hasattr(data, 'lists') else data.items())
        data = {k: (v[0] if isinstance(v, list) and len(v) == 1 else v) for k, v in data.items()}

        # crop name → crop FK
        if 'crop_name' in data and 'crop' not in data:
            data['crop'] = _resolve_crop(data.pop('crop_name'))
        else:
            data.pop('crop_name', None)

        # Field name aliases from frontend form
        if 'quantity_available_kg' in data and 'available_quantity_kg' not in data:
            data['available_quantity_kg'] = data.pop('quantity_available_kg')
        if 'available_until' in data and 'collection_deadline' not in data:
            data['collection_deadline'] = data.pop('available_until')

        # Drop frontend-only fields not on the model
        for key in ('title', 'price_per_kg', 'available_from'):
            data.pop(key, None)

        return super().to_internal_value(data)


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
