from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import F, FloatField, ExpressionWrapper
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
        search = request.query_params.get('search')
        if district:
            qs = qs.filter(district__icontains=district)
        if crop:
            qs = qs.filter(crops_specialised__name__icontains=crop)
        if search:
            qs = qs.filter(name__icontains=search)
        # rank by composite: reliability×0.35 + quality×0.35 + response×0.20 + dispatch×0.10
        qs = qs.annotate(
            composite_score=ExpressionWrapper(
                F('reliability_score') * 0.35 +
                F('quality_consistency_rate') * 0.35 +
                F('response_rate') * 0.20 +
                F('on_time_dispatch_rate') * 0.10,
                output_field=FloatField()
            )
        ).order_by('-composite_score', '-total_batches_dispatched')
        serializer = CooperativeDirectorySerializer(
            qs, many=True, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-transporters', url_name='my-transporters', permission_classes=[IsCooperativeManager])
    def my_transporters(self, request):
        try:
            coop = request.user.cooperative
        except Exception:
            return Response({'detail': 'No cooperative profile found.'}, status=status.HTTP_404_NOT_FOUND)
        from apps.transport.models import Transporter
        from apps.transport.serializers import TransporterSerializer
        transporters = Transporter.objects.filter(
            registered_by_cooperative=coop, is_active=True
        ).select_related('user')
        return Response(TransporterSerializer(transporters, many=True).data)


@api_view(['POST'])
@permission_classes([IsCooperativeManager])
def register_transporter(request):
    """Cooperative manager registers a transporter directly — no admin approval needed."""
    import secrets, hashlib
    from datetime import timedelta
    from django.utils import timezone
    from django.conf import settings
    from django.core.mail import send_mail
    from apps.authentication.models import User, OTPRecord
    from apps.authentication.serializers import UserCreateSerializer
    from apps.transport.models import Transporter

    try:
        coop = request.user.cooperative
    except Exception:
        return Response({'detail': 'No cooperative profile found.'}, status=status.HTTP_404_NOT_FOUND)

    data = {**request.data, 'role': 'TRANSPORTER'}
    serializer = UserCreateSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()

    operating_districts = request.data.get('operating_districts', [coop.district] if coop.district else ['Kigali'])
    if isinstance(operating_districts, str):
        operating_districts = [d.strip() for d in operating_districts.split(',') if d.strip()]

    Transporter.objects.create(
        user=user,
        company_name=request.data.get('company_name', ''),
        operating_districts=operating_districts,
        registered_by_cooperative=coop,
        is_active=True,
    )

    # Send OTP for account activation
    otp_code = ''.join(__import__('random').choices(__import__('string').digits, k=6))
    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
    expires_at = timezone.now() + timedelta(hours=getattr(settings, 'OTP_EXPIRY_HOURS', 24))
    OTPRecord.objects.create(
        user=user, otp_code=otp_hash,
        purpose=OTPRecord.Purpose.ACCOUNT_ACTIVATION, expires_at=expires_at,
    )
    if user.email:
        send_mail(
            'ChainSight — Activate Your Account',
            f"Hello {user.get_full_name()},\n\nYou have been registered as a transporter on ChainSight by {coop.name}.\n\nYour verification code is: {otp_code}\n\nThis code expires in 24 hours.\n\nChainSight Supply Chain Analytics System",
            settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True,
        )

    return Response({
        'message': f'Transporter {user.get_full_name()} registered. OTP sent to {user.email or user.phone_number}.',
        'user_id': user.id,
    }, status=status.HTTP_201_CREATED)


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


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsCooperativeManager])
def manage_transporter(request, pk):
    """Update fields or deactivate a transporter registered by this cooperative."""
    try:
        coop = request.user.cooperative
    except Exception:
        return Response({'detail': 'No cooperative profile found.'}, status=status.HTTP_404_NOT_FOUND)

    from apps.transport.models import Transporter
    from apps.transport.serializers import TransporterSerializer

    try:
        transporter = Transporter.objects.get(pk=pk, registered_by_cooperative=coop)
    except Transporter.DoesNotExist:
        return Response({'detail': 'Transporter not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        transporter.is_active = False
        transporter.save()
        return Response({'detail': 'Transporter deactivated.'})

    # PATCH — only allow safe fields
    for field in ('company_name',):
        if field in request.data:
            setattr(transporter, field, request.data[field])
    if 'operating_districts' in request.data:
        districts = request.data['operating_districts']
        if isinstance(districts, str):
            districts = [d.strip() for d in districts.split(',') if d.strip()]
        transporter.operating_districts = districts
    transporter.save()
    return Response(TransporterSerializer(transporter).data)


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
