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
from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.common.geo import nearest


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

    @action(detail=False, methods=['get'], permission_classes=[IsMarketAgent])
    def nearby(self, request):
        """Distributors sorted by distance from the requesting market agent's stall."""
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if lat and lng:
            origin_lat, origin_lng = float(lat), float(lng)
        else:
            try:
                agent = request.user.market_agent_profile
                origin_lat, origin_lng = agent.gps_latitude, agent.gps_longitude
            except Exception:
                origin_lat, origin_lng = None, None
        results = nearest(
            Distributor.objects.filter(is_active=True),
            origin_lat, origin_lng, 'warehouse_gps_lat', 'warehouse_gps_lng', limit=50,
        )
        return Response(DistributorSerializer(results, many=True).data)


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
        req = serializer.save(distributor=_get_or_create_distributor(self.request.user))
        notify(
            req.cooperative.manager,
            Notification.NotificationType.PRODUCE_REQUEST_RECEIVED,
            'New Produce Request Received',
            f'{req.distributor} requested {req.quantity_kg}kg of {req.crop.name}.',
            related_object_type='produce_request', related_object_id=req.id,
        )

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
        notify(
            req.distributor.user,
            Notification.NotificationType.COOP_RESPONSE,
            'Cooperative Accepted Your Request',
            f'{req.cooperative.name} accepted your request for {req.quantity_kg}kg of {req.crop.name}.',
            related_object_type='produce_request', related_object_id=req.id,
        )
        return Response(ProduceRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsCooperativeManager])
    def decline(self, request, pk=None):
        req = self.get_object()
        req.status = ProduceRequest.Status.DECLINED
        req.cooperative_response_notes = request.data.get('notes', '')
        req.responded_at = timezone.now()
        req.save()
        notify(
            req.distributor.user,
            Notification.NotificationType.COOP_RESPONSE,
            'Cooperative Declined Your Request',
            f'{req.cooperative.name} declined your request for {req.quantity_kg}kg of {req.crop.name}.',
            related_object_type='produce_request', related_object_id=req.id,
        )
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
        notice = serializer.save(distributor=_get_or_create_distributor(self.request.user))
        linked_agents = DistributorMarketAgentLink.objects.filter(
            distributor=notice.distributor, is_active=True
        ).select_related('market_agent__user')
        for link in linked_agents:
            notify(
                link.market_agent.user,
                Notification.NotificationType.COLLECTION_NOTICE_AVAILABLE,
                'New Collection Notice Available',
                f'{notice.distributor} has {notice.available_quantity_kg}kg of {notice.crop.name} ready for collection.',
                related_object_type='collection_notice', related_object_id=notice.id,
            )

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
        user = self.request.user
        if user.role == 'MARKET_AGENT':
            # Agent places an order; pull distributor from the linked notice
            notice = serializer.validated_data.get('collection_notice')
            try:
                agent = user.market_agent_profile
            except Exception:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'detail': 'Market agent profile not found.'})
            serializer.save(market_agent=agent, distributor=notice.distributor)
        else:
            serializer.save(distributor=_get_or_create_distributor(user))

    @action(detail=True, methods=['post'], permission_classes=[IsDistributor])
    def confirm(self, request, pk=None):
        order = self.get_object()
        qty = request.data.get('confirmed_quantity_kg', order.quantity_requested_kg)
        order.confirmed_quantity_kg = qty
        order.delivery_method = request.data.get('delivery_method')
        order.status = Order.Status.CONFIRMED
        order.confirmed_at = timezone.now()
        order.save()
        notify(
            order.market_agent.user,
            Notification.NotificationType.ORDER_CONFIRMED,
            'Order Confirmed by Distributor',
            f'{order.distributor} confirmed your order of {qty}kg.',
            related_object_type='order', related_object_id=order.id,
        )
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[IsDistributor])
    def decline(self, request, pk=None):
        order = self.get_object()
        order.status = Order.Status.DECLINED
        order.adjustment_reason = request.data.get('reason', '')
        order.save()
        notify(
            order.market_agent.user,
            Notification.NotificationType.ORDER_DECLINED,
            'Order Declined by Distributor',
            f'{order.distributor} declined your order. {order.adjustment_reason}'.strip(),
            related_object_type='order', related_object_id=order.id,
        )
        return Response(OrderSerializer(order).data)


# ── Market Agent link management ─────────────────────────────────────────────

class MarketAgentListView(APIView):
    """GET /distribution/market-agents/ — list agents linked to the current distributor.
    Add ?include_pending=true to also return pending (is_active=False) link requests."""
    permission_classes = [IsDistributor]

    def get(self, request):
        dist = _get_or_create_distributor(request.user)
        include_pending = request.query_params.get('include_pending') == 'true'
        qs = DistributorMarketAgentLink.objects.filter(distributor=dist)
        if not include_pending:
            qs = qs.filter(is_active=True)
        qs = qs.select_related('market_agent__user')
        data = [
            {
                'id': link.id,
                'market_agent_id': link.market_agent_id,
                'name': str(link.market_agent),
                'stall_number': link.market_agent.stall_number,
                'market_name': link.market_agent.market_name,
                'district': link.market_agent.market_district,
                'linked_at': link.linked_at,
                'is_active': link.is_active,
                'notes': link.notes,
            }
            for link in qs
        ]
        return Response(data)


class AgentMyLinksView(APIView):
    """GET /distribution/market-agents/my-links/ — agent sees their own link statuses."""
    permission_classes = [IsMarketAgent]

    def get(self, request):
        try:
            agent = request.user.market_agent_profile
        except Exception:
            return Response([])
        links = DistributorMarketAgentLink.objects.filter(
            market_agent=agent
        ).select_related('distributor__user')
        return Response([
            {
                'id': link.id,
                'distributor_id': link.distributor_id,
                'distributor_name': str(link.distributor),
                'is_active': link.is_active,
            }
            for link in links
        ])


class AgentRequestLinkView(APIView):
    """POST /distribution/market-agents/request-link/ — agent requests to connect with a distributor."""
    permission_classes = [IsMarketAgent]

    def post(self, request):
        distributor_id = request.data.get('distributor_id')
        if not distributor_id:
            return Response({'detail': 'distributor_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            distributor = Distributor.objects.get(id=distributor_id, is_active=True)
        except Distributor.DoesNotExist:
            return Response({'detail': 'Distributor not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            agent = request.user.market_agent_profile
        except Exception:
            return Response({'detail': 'Market agent profile not found.'}, status=status.HTTP_400_BAD_REQUEST)
        link, created = DistributorMarketAgentLink.objects.get_or_create(
            distributor=distributor,
            market_agent=agent,
            defaults={'is_active': False, 'notes': 'Requested by agent'},
        )
        if not created and link.is_active:
            return Response({'detail': 'Already linked.', 'id': link.id}, status=status.HTTP_200_OK)
        return Response(
            {'detail': 'Connection request sent — waiting for distributor approval.', 'id': link.id},
            status=status.HTTP_201_CREATED,
        )


class ApproveLinkRequestView(APIView):
    """POST /distribution/market-agents/link/<id>/approve/ — approve a pending agent request.
       DELETE — reject and remove it."""
    permission_classes = [IsDistributor]

    def post(self, request, link_id):
        dist = _get_or_create_distributor(request.user)
        try:
            link = DistributorMarketAgentLink.objects.get(id=link_id, distributor=dist)
        except DistributorMarketAgentLink.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)
        link.is_active = True
        link.save()
        return Response({'detail': 'Agent approved and linked.', 'id': link.id})

    def delete(self, request, link_id):
        dist = _get_or_create_distributor(request.user)
        try:
            link = DistributorMarketAgentLink.objects.get(id=link_id, distributor=dist)
        except DistributorMarketAgentLink.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)
        link.delete()
        return Response({'detail': 'Request rejected.'}, status=status.HTTP_204_NO_CONTENT)


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
