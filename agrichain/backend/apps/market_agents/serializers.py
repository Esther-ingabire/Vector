import uuid
from rest_framework import serializers
from .models import MarketAgent, CollectionConfirmation, WasteReport


class MarketAgentSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = MarketAgent
        fields = ['id', 'user', 'stall_number', 'market_name', 'market_district',
                  'gps_latitude', 'gps_longitude', 'is_active', 'created_at', 'name']
        read_only_fields = ['id', 'user', 'created_at']

    def get_name(self, obj):
        return str(obj)


class CollectionConfirmationSerializer(serializers.ModelSerializer):
    # Accept a list of condition codes from the UI; store first as condition_code, rest in notes
    condition_codes = serializers.ListField(
        child=serializers.ChoiceField(choices=CollectionConfirmation.ConditionCode.choices),
        write_only=True, required=False, default=list,
    )

    class Meta:
        model = CollectionConfirmation
        fields = [
            'id', 'order', 'market_agent',
            'quantity_collected_kg', 'collected_at', 'step1_idempotency_key',
            'quantity_arrived_at_stall_kg', 'condition_code', 'condition_codes',
            'condition_notes', 'arrived_at', 'step2_idempotency_key',
            'self_transport_loss_kg', 'self_transport_loss_pct',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'market_agent', 'self_transport_loss_kg',
            'self_transport_loss_pct', 'created_at', 'updated_at',
        ]

    def to_internal_value(self, data):
        # Auto-generate idempotency keys if not supplied by client
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if not data.get('step1_idempotency_key'):
            data['step1_idempotency_key'] = str(uuid.uuid4())
        if data.get('quantity_arrived_at_stall_kg') and not data.get('step2_idempotency_key'):
            data['step2_idempotency_key'] = str(uuid.uuid4())
        return super().to_internal_value(data)

    def create(self, validated_data):
        codes = validated_data.pop('condition_codes', [])
        if codes:
            validated_data['condition_code'] = codes[0]
            extras = codes[1:]
            if extras:
                existing = validated_data.get('condition_notes', '')
                validated_data['condition_notes'] = (
                    (existing + ' | ' if existing else '') + ' | '.join(extras)
                )
        instance = super().create(validated_data)
        instance.calculate_self_transport_loss()
        instance.save()
        return instance

    def update(self, instance, validated_data):
        codes = validated_data.pop('condition_codes', [])
        if codes:
            validated_data['condition_code'] = codes[0]
        instance = super().update(instance, validated_data)
        instance.calculate_self_transport_loss()
        instance.save()
        return instance


class WasteReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteReport
        fields = [
            'id', 'market_agent', 'order',
            'reporting_period_start', 'reporting_period_end',
            'quantity_sold_kg', 'quantity_discarded_kg',
            'discard_reason', 'discard_notes',
            'market_spoilage_loss_pct', 'submitted_at', 'idempotency_key',
        ]
        read_only_fields = ['id', 'market_agent', 'market_spoilage_loss_pct', 'submitted_at']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if not data.get('idempotency_key'):
            data['idempotency_key'] = str(uuid.uuid4())
        return super().to_internal_value(data)

    def create(self, validated_data):
        instance = super().create(validated_data)
        instance.calculate_spoilage_loss()
        instance.save()
        return instance


class CollectionNoticeForAgentSerializer(serializers.Serializer):
    """Read-only projection of CollectionNotice with risk assessment."""
    id = serializers.IntegerField()
    crop_name = serializers.SerializerMethodField()
    available_quantity_kg = serializers.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    collection_deadline = serializers.DateTimeField()
    pickup_location = serializers.CharField()
    distributor_name = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()
    risk_label = serializers.SerializerMethodField()

    def get_crop_name(self, obj):
        return obj.crop.name if obj.crop else ''

    def get_distributor_name(self, obj):
        try:
            return obj.distributor.user.get_full_name() or obj.distributor.company_name
        except Exception:
            return ''

    def _hours_left(self, obj):
        now = self.context.get('now') or __import__('django.utils.timezone', fromlist=['timezone']).timezone.now()
        delta = obj.collection_deadline - now
        return delta.total_seconds() / 3600

    def get_risk_level(self, obj):
        hours = self._hours_left(obj)
        crop = obj.crop
        if crop:
            if hours <= float(crop.safe_transit_hours_red):
                return 'HIGH'
            if hours <= float(crop.safe_transit_hours_amber):
                return 'AMBER'
        return 'LOW'

    def get_risk_label(self, obj):
        level = self.get_risk_level(obj)
        return {
            'LOW': 'Low Risk — Safe to self-collect',
            'AMBER': 'Amber Risk — Consider using a transporter',
            'HIGH': 'High Risk — Use a transporter',
        }[level]
