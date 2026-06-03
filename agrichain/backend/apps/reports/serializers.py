from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ['id', 'report_type', 'title', 'format', 'status',
                  'period_start', 'period_end', 'filter_district',
                  'filter_distributor', 'filter_market_agent', 'filter_batch',
                  'generated_by_user', 'generated_by_name', 'generated_by_job',
                  'file_url', 'file_size_kb', 'data_completeness_pct',
                  'error_message', 'created_at', 'completed_at']
        read_only_fields = ['id', 'status', 'generated_by_user', 'file_size_kb',
                            'data_completeness_pct', 'error_message', 'created_at', 'completed_at']

    def get_generated_by_name(self, obj):
        if obj.generated_by_user:
            return obj.generated_by_user.get_full_name()
        return 'Scheduled Job'

    def get_file_url(self, obj):
        if obj.file_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file_path.url)
        return None
