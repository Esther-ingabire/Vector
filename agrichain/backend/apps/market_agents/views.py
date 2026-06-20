from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Avg, Sum
import datetime

from .models import MarketAgent, CollectionConfirmation, WasteReport
from .serializers import (
    MarketAgentSerializer, CollectionConfirmationSerializer,
    WasteReportSerializer, CollectionNoticeForAgentSerializer,
)
from apps.authentication.permissions import IsMarketAgent
from apps.notifications.models import Notification
from apps.notifications.services import notify


class MarketAgentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarketAgentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MARKET_AGENT':
            return MarketAgent.objects.filter(user=user)
        if user.role in ('ADMIN', 'MINAGRI_OFFICER', 'DISTRIBUTOR'):
            return MarketAgent.objects.filter(is_active=True)
        return MarketAgent.objects.none()

    @action(detail=False, methods=['get'], permission_classes=[IsMarketAgent])
    def my(self, request):
        try:
            return Response(MarketAgentSerializer(request.user.market_agent_profile).data)
        except MarketAgent.DoesNotExist:
            return Response({'detail': 'No market agent profile found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='my-analytics', url_name='my-analytics',
            permission_classes=[IsMarketAgent])
    def my_analytics(self, request):
        try:
            agent = request.user.market_agent_profile
        except MarketAgent.DoesNotExist:
            return Response({'detail': 'No profile.'}, status=status.HTTP_404_NOT_FOUND)

        from apps.distribution.models import CollectionNotice
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        active_notices = CollectionNotice.objects.filter(is_active=True,
                                                          collection_deadline__gte=now).count()
        collections_month = CollectionConfirmation.objects.filter(
            market_agent=agent, created_at__gte=month_start
        ).count()

        # Collection loss: avg self_transport_loss_pct over last 30 days
        thirty_ago = now - datetime.timedelta(days=30)
        collection_loss = CollectionConfirmation.objects.filter(
            market_agent=agent,
            created_at__gte=thirty_ago,
            self_transport_loss_pct__isnull=False,
        ).aggregate(avg=Avg('self_transport_loss_pct'))['avg'] or 0

        # Waste rate: total discarded / (sold + discarded) over last 30 days
        waste_qs = WasteReport.objects.filter(market_agent=agent, submitted_at__gte=thirty_ago)
        totals = waste_qs.aggregate(
            sold=Sum('quantity_sold_kg'),
            discarded=Sum('quantity_discarded_kg'),
        )
        sold = float(totals['sold'] or 0)
        discarded = float(totals['discarded'] or 0)
        waste_rate = round((discarded / (sold + discarded)) * 100, 1) if (sold + discarded) > 0 else 0

        return Response({
            'active_notices': active_notices,
            'collection_loss_pct': round(float(collection_loss), 1),
            'waste_rate_pct': waste_rate,
            'collections_this_month': collections_month,
        })


class CollectionConfirmationViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionConfirmationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MARKET_AGENT':
            try:
                return CollectionConfirmation.objects.filter(market_agent=user.market_agent_profile)
            except MarketAgent.DoesNotExist:
                return CollectionConfirmation.objects.none()
        if user.role in ('ADMIN', 'DISTRIBUTOR', 'MINAGRI_OFFICER'):
            return CollectionConfirmation.objects.all()
        return CollectionConfirmation.objects.none()

    def perform_create(self, serializer):
        confirmation = serializer.save(market_agent=self.request.user.market_agent_profile)
        notify(
            confirmation.order.distributor.user,
            Notification.NotificationType.AGENT_COLLECTION_CONFIRMED,
            'Market Agent Collected Produce',
            f'{confirmation.market_agent} collected {confirmation.quantity_collected_kg}kg for Order #{confirmation.order_id}.',
            related_object_type='collection_confirmation', related_object_id=confirmation.id,
        )


class WasteReportViewSet(viewsets.ModelViewSet):
    serializer_class = WasteReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MARKET_AGENT':
            try:
                return WasteReport.objects.filter(market_agent=user.market_agent_profile)
            except MarketAgent.DoesNotExist:
                return WasteReport.objects.none()
        if user.role in ('ADMIN', 'DISTRIBUTOR', 'MINAGRI_OFFICER'):
            return WasteReport.objects.all()
        return WasteReport.objects.none()

    def perform_create(self, serializer):
        serializer.save(market_agent=self.request.user.market_agent_profile)


class AvailableNoticesView(APIView):
    """Active collection notices visible to market agents, with risk assessment."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.distribution.models import CollectionNotice
        now = timezone.now()
        notices = CollectionNotice.objects.filter(
            is_active=True, collection_deadline__gte=now
        ).select_related('distributor__user', 'crop')

        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        if min_price:
            notices = notices.filter(price_per_kg__gte=min_price)
        if max_price:
            notices = notices.filter(price_per_kg__lte=max_price)

        sort = request.query_params.get('sort')
        if sort == 'price_asc':
            notices = notices.order_by('price_per_kg', 'collection_deadline')
        elif sort == 'price_desc':
            notices = notices.order_by('-price_per_kg', 'collection_deadline')
        else:
            notices = notices.order_by('collection_deadline')

        serializer = CollectionNoticeForAgentSerializer(notices, many=True, context={'now': now})
        return Response(serializer.data)
