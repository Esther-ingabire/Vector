from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Crop, Cooperative, CooperativeStock, ColdStorageFacility
from .serializers import (
    CropSerializer, CooperativeSerializer, CooperativeDirectorySerializer,
    CooperativeStockSerializer, ColdStorageFacilitySerializer,
)
from apps.authentication.permissions import IsCooperativeManager, IsDistributor, IsAdminRole


class CropViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Crop.objects.filter(is_active=True)
    serializer_class = CropSerializer
    permission_classes = [permissions.IsAuthenticated]


class CooperativeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('ADMIN', 'MINAGRI_OFFICER', 'DISTRIBUTOR', 'TRANSPORTER'):
            return Cooperative.objects.filter(is_active=True)
        if user.role == 'COOPERATIVE_MANAGER':
            return Cooperative.objects.filter(manager=user)
        return Cooperative.objects.none()

    def get_serializer_class(self):
        if self.action in ('list', 'directory'):
            return CooperativeDirectorySerializer
        return CooperativeSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsCooperativeManager])
    def my(self, request):
        try:
            coop = request.user.cooperative
            return Response(CooperativeSerializer(coop).data)
        except Cooperative.DoesNotExist:
            return Response({'detail': 'No cooperative profile found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def directory(self, request):
        qs = Cooperative.objects.filter(is_active=True)
        district = request.query_params.get('district')
        crop = request.query_params.get('crop')
        if district:
            qs = qs.filter(district__icontains=district)
        if crop:
            qs = qs.filter(crops_specialised__name__icontains=crop)
        return Response(CooperativeDirectorySerializer(qs, many=True).data)


class CooperativeStockViewSet(viewsets.ModelViewSet):
    serializer_class = CooperativeStockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return CooperativeStock.objects.filter(cooperative=user.cooperative)
            except Cooperative.DoesNotExist:
                return CooperativeStock.objects.none()
        if user.role in ('ADMIN', 'DISTRIBUTOR', 'MINAGRI_OFFICER'):
            coop_id = self.request.query_params.get('cooperative')
            qs = CooperativeStock.objects.filter(is_available=True)
            if coop_id:
                qs = qs.filter(cooperative_id=coop_id)
            return qs
        return CooperativeStock.objects.none()

    def perform_create(self, serializer):
        serializer.save(cooperative=self.request.user.cooperative)


class ColdStorageFacilityViewSet(viewsets.ModelViewSet):
    serializer_class = ColdStorageFacilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return ColdStorageFacility.objects.filter(cooperative=user.cooperative)
            except Cooperative.DoesNotExist:
                return ColdStorageFacility.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return ColdStorageFacility.objects.filter(is_active=True)
        return ColdStorageFacility.objects.none()

    def perform_create(self, serializer):
        serializer.save(cooperative=self.request.user.cooperative)
