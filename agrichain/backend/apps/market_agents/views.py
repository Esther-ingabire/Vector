from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import MarketAgent, CollectionConfirmation, WasteReport
from .serializers import MarketAgentSerializer, CollectionConfirmationSerializer, WasteReportSerializer
from apps.authentication.permissions import IsMarketAgent


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
        serializer.save(market_agent=self.request.user.market_agent_profile)


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
