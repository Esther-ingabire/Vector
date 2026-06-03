from django.http import FileResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Report
from .serializers import ReportSerializer
from apps.authentication.permissions import IsAnalyticsRole


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAnalyticsRole]

    def get_queryset(self):
        qs = Report.objects.all()
        report_type = self.request.query_params.get('type')
        rpt_status = self.request.query_params.get('status')
        if report_type:
            qs = qs.filter(report_type=report_type)
        if rpt_status:
            qs = qs.filter(status=rpt_status)
        return qs

    def perform_create(self, serializer):
        report = serializer.save(
            generated_by_user=self.request.user,
            status=Report.Status.QUEUED,
        )
        # Trigger Celery task when implemented
        # from .tasks import generate_report
        # generate_report.delay(report.id)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        report = self.get_object()
        if report.status != Report.Status.READY or not report.file_path:
            return Response({'detail': 'Report is not ready for download.'},
                            status=status.HTTP_400_BAD_REQUEST)
        return FileResponse(report.file_path.open('rb'),
                            as_attachment=True,
                            filename=f"{report.title}.{report.format.lower()}")
