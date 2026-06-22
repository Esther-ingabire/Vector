from rest_framework import serializers
from .models import Batch, QRCodeScanEvent


def _batch_destination(obj):
    """
    Where this batch is headed — the linked transport request's destination if one is
    attached yet, else the receiving distributor's warehouse (known as soon as the supply
    agreement exists, even before a transporter is assigned).
    """
    if obj.transport_request_leg2_id and obj.transport_request_leg2:
        return obj.transport_request_leg2.destination
    if obj.transport_request_leg1_id and obj.transport_request_leg1:
        return obj.transport_request_leg1.destination
    dist = getattr(obj.supply_agreement.produce_request, 'distributor', None) if obj.supply_agreement_id else None
    if dist:
        return dist.warehouse_location or dist.district or str(dist)
    return None


class QRCodeScanEventSerializer(serializers.ModelSerializer):
    scanned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QRCodeScanEvent
        fields = ['id', 'batch', 'scan_point', 'scanned_by', 'scanned_by_name',
                  'gps_latitude', 'gps_longitude', 'scanned_at']
        read_only_fields = ['id', 'scanned_by', 'scanned_at']

    def get_scanned_by_name(self, obj):
        return obj.scanned_by.get_full_name()


class BatchSerializer(serializers.ModelSerializer):
    qr_scans = QRCodeScanEventSerializer(many=True, read_only=True)
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True)
    crop_name = serializers.CharField(source='crop.name', read_only=True)
    batch_id_short = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ['id', 'batch_id', 'batch_id_short', 'supply_agreement',
                  'cooperative', 'cooperative_name', 'crop', 'crop_name',
                  'dispatched_by', 'dispatch_weight_kg', 'quality_grade_at_dispatch',
                  'dispatch_timestamp', 'dispatch_gps_lat', 'dispatch_gps_lng',
                  'transport_request_leg1', 'transport_request_leg2', 'destination',
                  'received_by_distributor', 'weight_at_distributor_kg',
                  'quality_at_distributor', 'distributor_receipt_timestamp',
                  'order', 'current_status',
                  'transit_loss_leg1_kg', 'transit_loss_leg1_pct',
                  'self_transport_loss_kg', 'self_transport_loss_pct',
                  'market_spoilage_loss_kg', 'market_spoilage_loss_pct',
                  'total_loss_kg', 'total_loss_pct',
                  'created_at', 'updated_at', 'qr_scans']
        read_only_fields = ['id', 'batch_id', 'dispatched_by', 'cooperative', 'created_at', 'updated_at',
                            'transit_loss_leg1_kg', 'transit_loss_leg1_pct',
                            'self_transport_loss_kg', 'self_transport_loss_pct',
                            'market_spoilage_loss_kg', 'market_spoilage_loss_pct',
                            'total_loss_kg', 'total_loss_pct']

    def get_batch_id_short(self, obj):
        return str(obj.batch_id)[:8].upper()

    def get_destination(self, obj):
        return _batch_destination(obj)


class BatchListSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True)
    crop_name = serializers.CharField(source='crop.name', read_only=True)
    batch_id_short = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = [
            'id', 'batch_id', 'batch_id_short', 'cooperative_name', 'crop_name',
            'dispatch_weight_kg', 'quality_grade_at_dispatch',
            'current_status', 'dispatch_timestamp',
            'weight_at_distributor_kg', 'quality_at_distributor',
            'distributor_receipt_timestamp',
            'transit_loss_leg1_pct', 'total_loss_pct',
            'transport_request_leg1', 'transport_request_leg2', 'destination',
        ]

    def get_batch_id_short(self, obj):
        return str(obj.batch_id)[:8].upper()

    def get_destination(self, obj):
        return _batch_destination(obj)
