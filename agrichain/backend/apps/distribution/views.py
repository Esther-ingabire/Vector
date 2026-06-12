from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Distributor, DistributorMarketAgentLink, ProduceRequest, SupplyAgreement, CollectionNotice, Order
from .serializers import (
    DistributorSerializer, ProduceRequestSerializer, SupplyAgreementSerializer,
    CollectionNoticeSerializer, OrderSerializer,
)
from apps.authentication.permissions import IsDistributor, IsCooperativeManager, IsMarketAgent


def _get_or_create_distributor(user):
    """Return the Distributor profile, creating a stub if the account was approved but profile missing."""
    try:
        return user.distributor_profile
    except Distributor.DoesNotExist:
        return Distributor.objects.create(
            user=user,
            warehouse_location='Not specified',
            district=getattr(user, 'district', '') or 'Kigali',
            contact_phone=getattr(user, 'phone_number', '') or '',
        )


class DistributorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DistributorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'DISTRIBUTOR':
            return Distributor.objects.filter(user=user)
        return Distributor.objects.filter(is_active=True)

    @action(detail=False, methods=['get'], permission_classes=[IsDistributor])
    def my(self, request):
        try:
            return Response(DistributorSerializer(request.user.distributor_profile).data)
        except Distributor.DoesNotExist:
            return Response({'detail': 'No distributor profile found.'}, status=status.HTTP_404_NOT_FOUND)


class ProduceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ProduceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'DISTRIBUTOR':
            try:
                return ProduceRequest.objects.filter(distributor=user.distributor_profile)
            except Distributor.DoesNotExist:
                return ProduceRequest.objects.none()
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return ProduceRequest.objects.filter(cooperative=user.cooperative)
            except Exception:
                return ProduceRequest.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return ProduceRequest.objects.all()
        return ProduceRequest.objects.none()

    def perform_create(self, serializer):
        serializer.save(distributor=_get_or_create_distributor(self.request.user))

    @action(detail=True, methods=['post'], permission_classes=[IsCooperativeManager])
    def accept(self, request, pk=None):
        req = self.get_object()
        if req.status != ProduceRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = ProduceRequest.Status.ACCEPTED
        req.cooperative_response_notes = request.data.get('notes', '')
        req.responded_at = timezone.now()
        req.save()
        SupplyAgreement.objects.create(
            produce_request=req,
            agreed_quantity_kg=req.quantity_kg,
            agreed_quality_grade=req.quality_grade_required,
            agreed_delivery_date=req.required_delivery_date,
        )
        return Response(ProduceRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsCooperativeManager])
    def decline(self, request, pk=None):
        req = self.get_object()
        req.status = ProduceRequest.Status.DECLINED
        req.cooperative_response_notes = request.data.get('notes', '')
        req.responded_at = timezone.now()
        req.save()
        return Response(ProduceRequestSerializer(req).data)


class CollectionNoticeViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionNoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'DISTRIBUTOR':
            try:
                return CollectionNotice.objects.filter(distributor=user.distributor_profile)
            except Distributor.DoesNotExist:
                return CollectionNotice.objects.none()
        if user.role == 'MARKET_AGENT':
            try:
                linked_ids = user.market_agent_profile.distributor_links.filter(
                    is_active=True
                ).values_list('distributor_id', flat=True)
                return CollectionNotice.objects.filter(
                    distributor_id__in=linked_ids, is_active=True
                )
            except Exception:
                return CollectionNotice.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return CollectionNotice.objects.all()
        return CollectionNotice.objects.none()

    def perform_create(self, serializer):
        serializer.save(distributor=_get_or_create_distributor(self.request.user))

    @action(detail=True, methods=['post', 'patch'], permission_classes=[IsDistributor])
    def deactivate(self, request, pk=None):
        notice = self.get_object()
        notice.is_active = False
        notice.save()
        return Response(CollectionNoticeSerializer(notice).data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'DISTRIBUTOR':
            try:
                return Order.objects.filter(distributor=user.distributor_profile)
            except Distributor.DoesNotExist:
                return Order.objects.none()
        if user.role == 'MARKET_AGENT':
            try:
                return Order.objects.filter(market_agent=user.market_agent_profile)
            except Exception:
                return Order.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return Order.objects.all()
        return Order.objects.none()

    def perform_create(self, serializer):
        serializer.save(distributor=_get_or_create_distributor(self.request.user))

    @action(detail=True, methods=['post'], permission_classes=[IsDistributor])
    def confirm(self, request, pk=None):
        order = self.get_object()
        qty = request.data.get('confirmed_quantity_kg', order.quantity_requested_kg)
        order.confirmed_quantity_kg = qty
        order.delivery_method = request.data.get('delivery_method')
        order.status = Order.Status.CONFIRMED
        order.confirmed_at = timezone.now()
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[IsDistributor])
    def decline(self, request, pk=None):
        order = self.get_object()
        order.status = Order.Status.DECLINED
        order.adjustment_reason = request.data.get('reason', '')
        order.save()
        return Response(OrderSerializer(order).data)


# ── Market Agent link management ─────────────────────────────────────────────

class MarketAgentListView(APIView):
    """GET /distribution/market-agents/ — list agents linked to the current distributor."""
    permission_classes = [IsDistributor]

    def get(self, request):
        dist = _get_or_create_distributor(request.user)
        links = DistributorMarketAgentLink.objects.filter(
            distributor=dist, is_active=True
        ).select_related('market_agent__user')
        data = [
            {
                'id': link.id,
                'market_agent_id': link.market_agent_id,
                'name': str(link.market_agent),
                'stall_number': link.market_agent.stall_number,
                'market_name': link.market_agent.market_name,
                'district': link.market_agent.market_district,
                'linked_at': link.linked_at,
                'notes': link.notes,
            }
            for link in links
        ]
        return Response(data)


class MarketAgentLinkView(APIView):
    """POST /distribution/market-agents/link/ — link a market agent."""
    permission_classes = [IsDistributor]

    def post(self, request):
        from apps.market_agents.models import MarketAgent
        dist = _get_or_create_distributor(request.user)
        agent_id = request.data.get('market_agent_id')
        if not agent_id:
            return Response({'detail': 'market_agent_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            agent = MarketAgent.objects.get(id=agent_id, is_active=True)
        except MarketAgent.DoesNotExist:
            return Response({'detail': 'Market agent not found.'}, status=status.HTTP_404_NOT_FOUND)
        link, created = DistributorMarketAgentLink.objects.get_or_create(
            distributor=dist,
            market_agent=agent,
            defaults={'notes': request.data.get('notes', ''), 'is_active': True},
        )
        if not created:
            link.is_active = True
            link.notes = request.data.get('notes', link.notes)
            link.save()
        return Response(
            {'detail': 'Linked successfully.', 'id': link.id},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MarketAgentUnlinkView(APIView):
    """DELETE /distribution/market-agents/link/<id>/ — deactivate a link."""
    permission_classes = [IsDistributor]

    def delete(self, request, link_id):
        dist = _get_or_create_distributor(request.user)
        try:
            link = DistributorMarketAgentLink.objects.get(id=link_id, distributor=dist)
        except DistributorMarketAgentLink.DoesNotExist:
            return Response({'detail': 'Link not found.'}, status=status.HTTP_404_NOT_FOUND)
        link.is_active = False
        link.save()
        return Response({'detail': 'Unlinked.'})
