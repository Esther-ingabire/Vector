from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import NationalDailyKPI, DistrictDailyKPI, CooperativeReliabilityHistory, DeliveryMethodComparison
from .serializers import (
    NationalDailyKPISerializer, DistrictDailyKPISerializer,
    CooperativeReliabilityHistorySerializer, DeliveryMethodComparisonSerializer,
)
from apps.authentication.permissions import IsAnalyticsRole


class NationalKPIViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NationalDailyKPISerializer
    permission_classes = [IsAnalyticsRole]

    def get_queryset(self):
        qs = NationalDailyKPI.objects.all()
        days = self.request.query_params.get('days')
        if days:
            from django.utils import timezone
            from datetime import timedelta
            cutoff = timezone.now().date() - timedelta(days=int(days))
            qs = qs.filter(date__gte=cutoff)
        return qs

    @action(detail=False, methods=['get'])
    def latest(self, request):
        kpi = NationalDailyKPI.objects.first()
        if not kpi:
            return Response({})
        return Response(NationalDailyKPISerializer(kpi).data)


class DistrictKPIViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DistrictDailyKPISerializer
    permission_classes = [IsAnalyticsRole]

    def get_queryset(self):
        qs = DistrictDailyKPI.objects.all()
        district = self.request.query_params.get('district')
        days = self.request.query_params.get('days')
        if district:
            qs = qs.filter(district_name__icontains=district)
        if days:
            from django.utils import timezone
            from datetime import timedelta
            cutoff = timezone.now().date() - timedelta(days=int(days))
            qs = qs.filter(date__gte=cutoff)
        return qs


class CooperativeReliabilityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CooperativeReliabilityHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return CooperativeReliabilityHistory.objects.filter(cooperative=user.cooperative)
            except Exception:
                return CooperativeReliabilityHistory.objects.none()
        return CooperativeReliabilityHistory.objects.all()


class DeliveryMethodComparisonViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeliveryMethodComparisonSerializer
    permission_classes = [IsAnalyticsRole]
    queryset = DeliveryMethodComparison.objects.all()
