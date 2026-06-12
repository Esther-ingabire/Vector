from django.db.models import Avg, Count
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = DeliveryMethodComparison.objects.all()
        if user.role == 'DISTRIBUTOR':
            try:
                qs = qs.filter(distributor=user.distributor_profile)
            except Exception:
                return qs.none()
        elif user.role not in ('ADMIN', 'MINAGRI_OFFICER'):
            return qs.none()
        return qs


class DistributionAnalyticsView(APIView):
    """
    GET /analytics/distribution/
    Returns per-distributor analytics: order counts, average loss rates by delivery method,
    active notices, and crop-level breakdown.
    Computes live from the database — no nightly job required.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.distribution.models import Distributor, Order, CollectionNotice
        from apps.traceability.models import Batch

        user = request.user
        if user.role not in ('DISTRIBUTOR', 'ADMIN', 'MINAGRI_OFFICER'):
            return Response(
                {'detail': 'Access restricted to distributors and analytics roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Scope to this distributor unless admin/MINAGRI
        dist = None
        if user.role == 'DISTRIBUTOR':
            try:
                dist = user.distributor_profile
            except Distributor.DoesNotExist:
                return Response({
                    'total_orders': 0,
                    'self_collection_count': 0,
                    'transporter_count': 0,
                    'self_collection_avg_loss_pct': 0,
                    'transporter_avg_loss_pct': 0,
                    'active_notices': 0,
                    'crop_breakdown': [],
                })

        orders = Order.objects.filter(distributor=dist) if dist else Order.objects.all()
        batches = Batch.objects.filter(received_by_distributor=dist) if dist else Batch.objects.all()
        notices_qs = CollectionNotice.objects.filter(distributor=dist, is_active=True) if dist else CollectionNotice.objects.filter(is_active=True)

        self_collect_loss = batches.filter(
            order__delivery_method='SELF_COLLECTION',
            transit_loss_leg1_pct__isnull=False,
        ).aggregate(avg=Avg('transit_loss_leg1_pct'))['avg'] or 0

        transport_loss = batches.filter(
            order__delivery_method='TRANSPORTER_DELIVERY',
            transit_loss_leg1_pct__isnull=False,
        ).aggregate(avg=Avg('transit_loss_leg1_pct'))['avg'] or 0

        crop_data = batches.values('crop__name').annotate(
            count=Count('id'),
            avg_loss=Avg('transit_loss_leg1_pct'),
        ).order_by('-avg_loss')

        return Response({
            'total_orders': orders.count(),
            'self_collection_count': orders.filter(delivery_method='SELF_COLLECTION').count(),
            'transporter_count': orders.filter(delivery_method='TRANSPORTER_DELIVERY').count(),
            'self_collection_avg_loss_pct': round(float(self_collect_loss), 2),
            'transporter_avg_loss_pct': round(float(transport_loss), 2),
            'active_notices': notices_qs.count(),
            'crop_breakdown': [
                {
                    'crop': row['crop__name'],
                    'batch_count': row['count'],
                    'avg_loss_pct': round(float(row['avg_loss'] or 0), 2),
                }
                for row in crop_data
            ],
        })
