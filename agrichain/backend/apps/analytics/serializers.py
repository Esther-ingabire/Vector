from rest_framework import serializers
from .models import NationalDailyKPI, DistrictDailyKPI, CooperativeReliabilityHistory, DeliveryMethodComparison


class NationalDailyKPISerializer(serializers.ModelSerializer):
    class Meta:
        model = NationalDailyKPI
        fields = '__all__'


class DistrictDailyKPISerializer(serializers.ModelSerializer):
    class Meta:
        model = DistrictDailyKPI
        fields = '__all__'


class CooperativeReliabilityHistorySerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True)

    class Meta:
        model = CooperativeReliabilityHistory
        fields = ['id', 'cooperative', 'cooperative_name', 'week_starting',
                  'reliability_score', 'on_time_dispatch_rate', 'quality_consistency',
                  'response_rate', 'batches_this_week', 'computed_at']


class DeliveryMethodComparisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryMethodComparison
        fields = '__all__'
