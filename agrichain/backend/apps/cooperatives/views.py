from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import F, FloatField, ExpressionWrapper
from .models import (
    Crop, Cooperative, CooperativeStock, ColdStorageFacility,
    WarehouseManager, WarehouseRentalRequest,
)
from .serializers import (
    CropSerializer, CooperativeSerializer, CooperativeDirectorySerializer,
    CooperativeStockSerializer, ColdStorageFacilitySerializer,
    WarehouseManagerSerializer, WarehouseRentalRequestSerializer,
)
from apps.authentication.permissions import IsCooperativeManager, IsDistributor, IsAdminRole, IsWarehouseManager
from apps.common.geo import nearest
from apps.notifications.models import Notification
from apps.notifications.services import notify


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

        if request.query_params.get('nearby') == 'true':
            origin_lat, origin_lng = self._origin_coords(request)
            results = nearest(qs, origin_lat, origin_lng, 'gps_latitude', 'gps_longitude', limit=50)
        else:
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
            results = qs
        serializer = CooperativeDirectorySerializer(
            results, many=True, context={'request': request}
        )
        return Response(serializer.data)

    def _origin_coords(self, request):
        """Origin point for 'nearby' sorting — explicit ?lat=&lng= override, else the
        requesting distributor's warehouse location."""
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if lat and lng:
            return float(lat), float(lng)
        user = request.user
        if user.role == 'DISTRIBUTOR':
            try:
                return user.distributor_profile.warehouse_gps_lat, user.distributor_profile.warehouse_gps_lng
            except Exception:
                return None, None
        return None, None

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

    import re
    from django.db import IntegrityError

    phone = request.data.get('phone_number', '')
    digits = re.sub(r'\D', '', phone)[-8:] or secrets.token_hex(4)
    base_username = request.data.get('username') or f'trans.{digits}'
    # Ensure username is unique by appending a suffix if needed
    username = base_username
    suffix = 1
    from apps.authentication.models import User as _User
    while _User.objects.filter(username=username).exists():
        username = f'{base_username}.{suffix}'
        suffix += 1

    data = {**request.data, 'role': 'TRANSPORTER', 'username': username}
    serializer = UserCreateSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = serializer.save()
    except IntegrityError as e:
        err = str(e)
        if 'phone_number' in err:
            return Response({'phone_number': ['A user with this phone number already exists.']}, status=status.HTTP_400_BAD_REQUEST)
        if 'email' in err:
            return Response({'email': ['A user with this email already exists.']}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Could not create user — a duplicate entry exists.'}, status=status.HTTP_400_BAD_REQUEST)

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
        'otp_code': otp_code,  # shown in dev so manager can manually share it
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
        if user.role == 'WAREHOUSE_MANAGER':
            try:
                return ColdStorageFacility.objects.filter(warehouse_manager=user.warehouse_manager_profile)
            except WarehouseManager.DoesNotExist:
                return ColdStorageFacility.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return ColdStorageFacility.objects.filter(is_active=True)
        return ColdStorageFacility.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'WAREHOUSE_MANAGER':
            serializer.save(warehouse_manager=user.warehouse_manager_profile)
        elif user.role == 'COOPERATIVE_MANAGER':
            serializer.save(cooperative=user.cooperative)
        else:
            serializer.save()


class WarehouseManagerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WarehouseManagerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WarehouseManager.objects.filter(is_active=True)

    @action(detail=False, methods=['get'], permission_classes=[IsWarehouseManager])
    def my(self, request):
        try:
            return Response(WarehouseManagerSerializer(request.user.warehouse_manager_profile).data)
        except WarehouseManager.DoesNotExist:
            return Response({'detail': 'No warehouse manager profile found.'}, status=status.HTTP_404_NOT_FOUND)


class WarehouseDirectoryView(APIView):
    """GET /cooperatives/warehouses/ — facilities available for rent, for cooperatives to browse.
    Add ?nearby=true to sort by distance from the requesting cooperative's location."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ColdStorageFacility.objects.filter(
            is_active=True, is_available_for_rent=True, warehouse_manager__isnull=False,
        ).select_related('warehouse_manager')
        district = request.query_params.get('district')
        if district:
            qs = qs.filter(location_description__icontains=district)

        if request.query_params.get('nearby') == 'true':
            origin_lat = request.query_params.get('lat')
            origin_lng = request.query_params.get('lng')
            if origin_lat and origin_lng:
                origin_lat, origin_lng = float(origin_lat), float(origin_lng)
            elif request.user.role == 'COOPERATIVE_MANAGER':
                try:
                    origin_lat, origin_lng = request.user.cooperative.gps_latitude, request.user.cooperative.gps_longitude
                except Exception:
                    origin_lat, origin_lng = None, None
            else:
                origin_lat, origin_lng = None, None
            results = nearest(qs, origin_lat, origin_lng, 'gps_latitude', 'gps_longitude', limit=50)
        else:
            results = qs

        return Response(ColdStorageFacilitySerializer(results, many=True).data)


class WarehouseRentalRequestViewSet(viewsets.ModelViewSet):
    serializer_class = WarehouseRentalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return WarehouseRentalRequest.objects.filter(cooperative=user.cooperative)
            except Exception:
                return WarehouseRentalRequest.objects.none()
        if user.role == 'WAREHOUSE_MANAGER':
            try:
                return WarehouseRentalRequest.objects.filter(
                    facility__warehouse_manager=user.warehouse_manager_profile
                )
            except Exception:
                return WarehouseRentalRequest.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return WarehouseRentalRequest.objects.all()
        return WarehouseRentalRequest.objects.none()

    def perform_create(self, serializer):
        req = serializer.save(cooperative=self.request.user.cooperative)
        if req.facility.warehouse_manager_id:
            notify(
                req.facility.warehouse_manager.user,
                Notification.NotificationType.WAREHOUSE_RENTAL_REQUESTED,
                'New Warehouse Rental Request',
                f'{req.cooperative.name} requested {req.requested_capacity_kg}kg of space in {req.facility.name}.',
                related_object_type='warehouse_rental_request', related_object_id=req.id,
            )

    @action(detail=True, methods=['post'], permission_classes=[IsWarehouseManager])
    def accept(self, request, pk=None):
        rental = self.get_object()
        if rental.status != WarehouseRentalRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        rental.status = WarehouseRentalRequest.Status.ACCEPTED
        rental.responded_at = timezone.now()
        rental.save()
        # Hand the facility to the renting cooperative — every existing IoT/analytics
        # code path keyed on facility.cooperative now scopes correctly automatically.
        facility = rental.facility
        facility.cooperative = rental.cooperative
        facility.is_available_for_rent = False
        facility.save(update_fields=['cooperative', 'is_available_for_rent'])
        notify(
            rental.cooperative.manager,
            Notification.NotificationType.WAREHOUSE_RENTAL_RESPONSE,
            'Warehouse Rental Request Accepted',
            f'{facility.warehouse_manager} accepted your request to rent space in {facility.name}.',
            related_object_type='warehouse_rental_request', related_object_id=rental.id,
        )
        return Response(WarehouseRentalRequestSerializer(rental).data)

    @action(detail=True, methods=['post'], permission_classes=[IsWarehouseManager])
    def decline(self, request, pk=None):
        rental = self.get_object()
        if rental.status != WarehouseRentalRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        rental.status = WarehouseRentalRequest.Status.DECLINED
        rental.decline_reason = request.data.get('reason', '')
        rental.responded_at = timezone.now()
        rental.save()
        notify(
            rental.cooperative.manager,
            Notification.NotificationType.WAREHOUSE_RENTAL_RESPONSE,
            'Warehouse Rental Request Declined',
            f'{rental.facility.warehouse_manager} declined your request for {rental.facility.name}. {rental.decline_reason}'.strip(),
            related_object_type='warehouse_rental_request', related_object_id=rental.id,
        )
        return Response(WarehouseRentalRequestSerializer(rental).data)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """Either party can end an active rental — frees the facility for re-listing."""
        rental = self.get_object()
        if rental.status != WarehouseRentalRequest.Status.ACCEPTED:
            return Response({'detail': 'Only an active rental can be ended.'}, status=status.HTTP_400_BAD_REQUEST)
        rental.status = WarehouseRentalRequest.Status.ENDED
        rental.responded_at = timezone.now()
        rental.save()
        facility = rental.facility
        facility.cooperative = None
        facility.is_available_for_rent = True
        facility.save(update_fields=['cooperative', 'is_available_for_rent'])
        return Response(WarehouseRentalRequestSerializer(rental).data)
