from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Distributor, ProduceRequest, SupplyAgreement, CollectionNotice, Order
from .serializers import (
    DistributorSerializer, ProduceRequestSerializer, SupplyAgreementSerializer,
    CollectionNoticeSerializer, OrderSerializer,
)
from apps.authentication.permissions import IsDistributor, IsCooperativeManager, IsMarketAgent


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
        serializer.save(distributor=self.request.user.distributor_profile)

    @action(detail=True, methods=['post'], permission_classes=[IsCooperativeManager])
    def accept(self, request, pk=None):
        req = self.get_object()
        if req.status != ProduceRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        notes = request.data.get('notes', '')
        req.status = ProduceRequest.Status.ACCEPTED
        req.cooperative_response_notes = notes
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
            # Market agents see notices from linked distributors only
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
        serializer.save(distributor=self.request.user.distributor_profile)


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
        serializer.save(distributor=self.request.user.distributor_profile)

    @action(detail=True, methods=['post'], permission_classes=[IsDistributor])
    def confirm(self, request, pk=None):
        order = self.get_object()
        qty = request.data.get('confirmed_quantity_kg', order.quantity_requested_kg)
        delivery_method = request.data.get('delivery_method')
        order.confirmed_quantity_kg = qty
        order.delivery_method = delivery_method
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
