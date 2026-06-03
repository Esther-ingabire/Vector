from rest_framework import serializers
from .models import AIInsight, DailyBriefBundle


class AIInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInsight
        fields = ['id', 'insight_type', 'title', 'content',
                  'data_period_start', 'data_period_end',
                  'is_critical', 'alert_triggered',
                  'related_district', 'related_cooperative', 'related_market_agent',
                  'generated_at']
        read_only_fields = ['id', 'generated_at']


class DailyBriefBundleSerializer(serializers.ModelSerializer):
    insights = AIInsightSerializer(many=True, read_only=True)

    class Meta:
        model = DailyBriefBundle
        fields = ['id', 'brief_date', 'summary_text', 'insights', 'generated_at']
        read_only_fields = ['id', 'generated_at']
