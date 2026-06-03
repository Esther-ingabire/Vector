from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AIInsight, DailyBriefBundle
from .serializers import AIInsightSerializer, DailyBriefBundleSerializer
from apps.authentication.permissions import IsAnalyticsRole


class AIInsightViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AIInsightSerializer
    permission_classes = [IsAnalyticsRole]

    def get_queryset(self):
        qs = AIInsight.objects.all()
        insight_type = self.request.query_params.get('type')
        district = self.request.query_params.get('district')
        critical = self.request.query_params.get('critical')
        if insight_type:
            qs = qs.filter(insight_type=insight_type)
        if district:
            qs = qs.filter(related_district__icontains=district)
        if critical == 'true':
            qs = qs.filter(is_critical=True)
        return qs


class DailyBriefBundleViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DailyBriefBundleSerializer
    permission_classes = [IsAnalyticsRole]
    queryset = DailyBriefBundle.objects.all()

    @action(detail=False, methods=['get'])
    def latest(self, request):
        bundle = DailyBriefBundle.objects.first()
        if not bundle:
            return Response({'detail': 'No daily brief available yet.'})
        return Response(DailyBriefBundleSerializer(bundle).data)
