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
    class Meta:
        model = CollectionConfirmation
        fields = ['id', 'order', 'market_agent',
                  'quantity_collected_kg', 'collected_at', 'step1_idempotency_key',
                  'quantity_arrived_at_stall_kg', 'condition_code', 'condition_notes',
                  'arrived_at', 'step2_idempotency_key',
                  'self_transport_loss_kg', 'self_transport_loss_pct',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'market_agent', 'self_transport_loss_kg',
                            'self_transport_loss_pct', 'created_at', 'updated_at']

    def create(self, validated_data):
        instance = super().create(validated_data)
        instance.calculate_self_transport_loss()
        instance.save()
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.calculate_self_transport_loss()
        instance.save()
        return instance


class WasteReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteReport
        fields = ['id', 'market_agent', 'order', 'reporting_period_start',
                  'reporting_period_end', 'quantity_sold_kg', 'quantity_discarded_kg',
                  'discard_reason', 'discard_notes', 'market_spoilage_loss_pct',
                  'submitted_at', 'idempotency_key']
        read_only_fields = ['id', 'market_agent', 'market_spoilage_loss_pct', 'submitted_at']

    def create(self, validated_data):
        instance = super().create(validated_data)
        instance.calculate_spoilage_loss()
        instance.save()
        return instance
