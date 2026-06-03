from rest_framework import serializers
from .models import LossPrediction


class LossPredictionSerializer(serializers.ModelSerializer):
    batch_id_short = serializers.SerializerMethodField()

    class Meta:
        model = LossPrediction
        fields = ['id', 'batch', 'batch_id_short', 'order', 'prediction_stage',
                  'risk_score', 'risk_label', 'confidence_pct', 'phase',
                  'contributing_factors', 'recommendation', 'alert_generated', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_batch_id_short(self, obj):
        if obj.batch:
            return str(obj.batch.batch_id)[:8].upper()
        return None
