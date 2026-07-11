"""
Authentication views: login, OTP verify, set password, access requests, user management.
"""
import hashlib, random, string, io
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.core.files.base import ContentFile
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, AccessRequest, OTPRecord, AuditLog
from .serializers import (
    LoginSerializer, OTPVerifySerializer, SetPasswordSerializer,
    AccessRequestSerializer, AccessRequestAdminSerializer,
    UserSerializer, UserCreateSerializer, AuditLogSerializer
)
from .permissions import IsAdminRole


def create_role_profile(user, access_request):
    """Auto-create role-specific entity when admin approves a user."""
    role = user.role
    org = access_request.organization_name or ''
    district = access_request.district or ''
    phone = access_request.phone_number or ''

    if role == 'COOPERATIVE_MANAGER':
        from apps.cooperatives.models import Cooperative
        if not hasattr(user, 'cooperative'):
            import datetime
            reg_num = f"COOP-{datetime.date.today().year}-{user.id:04d}"
            Cooperative.objects.create(
                manager=user,
                name=org or f"{user.get_full_name()} Cooperative",
                registration_number=reg_num,
                district=district,
                contact_phone=phone,
                reliability_score=0.0,
                on_time_dispatch_rate=0.0,
                quality_consistency_rate=0.0,
                response_rate=0.0,
                total_batches_dispatched=0,
                is_active=True,
            )

    elif role == 'DISTRIBUTOR':
        from apps.distribution.models import Distributor
        if not hasattr(user, 'distributor_profile'):
            Distributor.objects.create(
                user=user,
                company_name=org,
                warehouse_location=district,
                district=district,
                contact_phone=phone,
                is_active=True,
            )

    elif role in ('TRANSPORTER', 'TRANSPORT_COMPANY'):
        from apps.transport.models import Transporter
        if not hasattr(user, 'transporter_profile'):
            Transporter.objects.create(
                user=user,
                company_name=org,
                operating_districts=[district] if district else ['Kigali'],
                is_active=True,
            )

    elif role == 'MARKET_AGENT':
        from apps.market_agents.models import MarketAgent
        if not hasattr(user, 'market_agent_profile'):
            MarketAgent.objects.create(
                user=user,
                stall_number='TBD',
                market_name=org or f"{district} Market",
                market_district=district,
                is_active=True,
            )

    elif role == 'WAREHOUSE_MANAGER':
        from apps.cooperatives.models import WarehouseManager
        if not hasattr(user, 'warehouse_manager_profile'):
            WarehouseManager.objects.create(
                user=user,
                company_name=org,
                district=district,
                contact_phone=phone,
                is_active=True,
            )


def get_client_ip(request):
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    return x_forwarded.split(",")[0] if x_forwarded else request.META.get("REMOTE_ADDR")


def generate_otp():
    return "".join(random.choices(string.digits, k=6))


def send_otp_email(user, otp_code, purpose):
    subject_map = {
        OTPRecord.Purpose.ACCOUNT_ACTIVATION: "ChainSight — Activate Your Account",
        OTPRecord.Purpose.PASSWORD_RESET: "ChainSight — Password Reset",
        OTPRecord.Purpose.MFA_LOGIN: "ChainSight — Login Verification",
        OTPRecord.Purpose.CONTACT_CHANGE: "ChainSight — Verify Contact Change",
    }
    subject = subject_map.get(purpose, "ChainSight — Verification Code")
    message = (
        f"Hello {user.get_full_name()},\n\n"
        f"Your verification code is: {otp_code}\n\n"
        f"This code expires in 24 hours.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"ChainSight Supply Chain Analytics System"
    )
    if user.email:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)


def create_otp_record(user, purpose):
    otp_code = generate_otp()
    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
    expires_at = timezone.now() + timedelta(hours=settings.OTP_EXPIRY_HOURS)
    OTPRecord.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
    otp_record = OTPRecord.objects.create(
        user=user, otp_code=otp_hash, purpose=purpose, expires_at=expires_at
    )
    return otp_code, otp_record


def log_action(user, action, description, request=None, **kwargs):
    AuditLog.objects.create(
        user=user, action=action, description=description,
        ip_address=get_client_ip(request) if request else None,
        user_agent=request.META.get("HTTP_USER_AGENT","") if request else "",
        **kwargs
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data["user"]

    if user.mfa_enabled:
        otp_code, _ = create_otp_record(user, OTPRecord.Purpose.MFA_LOGIN)
        send_otp_email(user, otp_code, OTPRecord.Purpose.MFA_LOGIN)
        log_action(user, AuditLog.Action.OTP_SENT, "MFA login verification code sent", request)
        return Response({
            "mfa_required": True,
            "credential": request.data.get("credential", "").strip(),
        })

    refresh = RefreshToken.for_user(user)
    log_action(user, AuditLog.Action.LOGIN, f"User logged in from {get_client_ip(request)}", request)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user, context={"request": request}).data,
        "must_change_password": user.must_change_password,
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def verify_otp(request):
    serializer = OTPVerifySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data["user"]
    otp_record = serializer.validated_data["otp_record"]
    otp_record.is_used = True
    otp_record.used_at = timezone.now()
    otp_record.save()

    purpose = serializer.validated_data.get("purpose") or OTPRecord.Purpose.ACCOUNT_ACTIVATION
    if purpose == OTPRecord.Purpose.ACCOUNT_ACTIVATION:
        user.is_verified = True
        user.save(update_fields=["is_verified"])
    elif purpose == OTPRecord.Purpose.PASSWORD_RESET:
        user.must_change_password = True
        user.save(update_fields=["must_change_password"])

    log_action(user, AuditLog.Action.OTP_VERIFIED, f"OTP verified for purpose: {purpose}", request)
    if purpose == OTPRecord.Purpose.MFA_LOGIN:
        log_action(user, AuditLog.Action.LOGIN, f"User logged in (2FA) from {get_client_ip(request)}", request)

    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
        "must_change_password": user.must_change_password,
        "message": "OTP verified successfully.",
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mfa_request_enable_otp(request):
    """Step 1 of enabling 2FA — proves the user still has access to their registered email."""
    user = request.user
    if user.mfa_enabled:
        return Response({"detail": "Two-factor authentication is already enabled."}, status=status.HTTP_400_BAD_REQUEST)
    otp_code, _ = create_otp_record(user, OTPRecord.Purpose.MFA_ENABLE)
    send_otp_email(user, otp_code, OTPRecord.Purpose.MFA_ENABLE)
    log_action(user, AuditLog.Action.OTP_SENT, "2FA setup verification code sent", request)
    return Response({"detail": "A verification code has been sent to your email."})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mfa_enable(request):
    """Step 2 of enabling 2FA — confirm the code from mfa_request_enable_otp."""
    user = request.user
    otp_code = (request.data.get("otp_code") or "").strip()
    if len(otp_code) != 6:
        return Response({"otp_code": "Enter the 6-digit code."}, status=status.HTTP_400_BAD_REQUEST)

    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
    try:
        otp_record = OTPRecord.objects.filter(
            user=user, purpose=OTPRecord.Purpose.MFA_ENABLE, is_used=False
        ).latest("created_at")
    except OTPRecord.DoesNotExist:
        return Response({"otp_code": "No active code found. Request a new one."}, status=status.HTTP_400_BAD_REQUEST)
    if otp_record.otp_code != otp_hash:
        return Response({"otp_code": "Incorrect code."}, status=status.HTTP_400_BAD_REQUEST)
    if otp_record.is_expired():
        return Response({"otp_code": "Code expired. Request a new one."}, status=status.HTTP_400_BAD_REQUEST)

    otp_record.is_used = True
    otp_record.used_at = timezone.now()
    otp_record.save()

    user.mfa_enabled = True
    user.save(update_fields=["mfa_enabled"])
    log_action(user, AuditLog.Action.MFA_ENABLED, "Two-factor authentication enabled", request)
    return Response(UserSerializer(user, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mfa_disable(request):
    """Disabling 2FA requires the current password — same bar as any other security downgrade."""
    user = request.user
    password = request.data.get("password") or ""
    if not user.check_password(password):
        return Response({"password": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)
    user.mfa_enabled = False
    user.save(update_fields=["mfa_enabled"])
    log_action(user, AuditLog.Action.MFA_DISABLED, "Two-factor authentication disabled", request)
    return Response(UserSerializer(user, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def set_password(request):
    serializer = SetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    user.set_password(serializer.validated_data["new_password"])
    user.must_change_password = False
    user.save(update_fields=["password","must_change_password"])
    log_action(user, AuditLog.Action.PASSWORD_CHANGED, "Password changed by user", request)
    return Response({"message": "Password changed successfully."})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def request_access(request):
    serializer = AccessRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    access_request = serializer.save()
    return Response(
        {"message": "Your request has been submitted. An administrator will review it and contact you.", "id": access_request.id},
        status=status.HTTP_201_CREATED
    )


class AccessRequestAdminViewSet(viewsets.ModelViewSet):
    queryset = AccessRequest.objects.all().order_by("-created_at")
    serializer_class = AccessRequestAdminSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


@api_view(["POST"])
@permission_classes([IsAdminRole])
def approve_and_create_user(request, access_request_id):
    try:
        access_request = AccessRequest.objects.get(id=access_request_id, status=AccessRequest.Status.PENDING)
    except AccessRequest.DoesNotExist:
        return Response({"error": "Access request not found or already processed."}, status=404)

    serializer = UserCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()

    # Create role-specific profile entity
    create_role_profile(user, access_request)

    # Link access request to created user
    access_request.status = AccessRequest.Status.APPROVED
    access_request.reviewed_by = request.user
    access_request.reviewed_at = timezone.now()
    access_request.created_user = user
    access_request.save()

    # Generate and send OTP for account activation
    otp_code, _ = create_otp_record(user, OTPRecord.Purpose.ACCOUNT_ACTIVATION)
    send_otp_email(user, otp_code, OTPRecord.Purpose.ACCOUNT_ACTIVATION)

    log_action(request.user, AuditLog.Action.ACCOUNT_CREATED,
               f"Created account for {user.get_full_name()} ({user.role})", request,
               content_type="User", object_id=str(user.id))

    return Response({
        "message": f"Account created for {user.get_full_name()}. OTP sent to {user.email or user.phone_number}.",
        "user_id": user.id
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAdminRole])
def reject_access_request(request, access_request_id):
    try:
        access_request = AccessRequest.objects.get(id=access_request_id, status=AccessRequest.Status.PENDING)
    except AccessRequest.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    access_request.status = AccessRequest.Status.REJECTED
    access_request.admin_notes = request.data.get("reason", "")
    access_request.reviewed_by = request.user
    access_request.reviewed_at = timezone.now()
    access_request.save()
    return Response({"message": "Access request rejected."})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        allowed = {"first_name", "last_name", "email", "language_preference"}
        data = {k: v for k, v in request.data.items() if k in allowed}
        for field, value in data.items():
            setattr(request.user, field, value)
        request.user.save(update_fields=list(data.keys()))
        log_action(request.user, AuditLog.Action.DATA_UPDATED, "User updated their profile", request)
        return Response(UserSerializer(request.user, context={"request": request}).data)
    return Response(UserSerializer(request.user, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAdminRole])
def create_user_directly(request):
    """Admin creates a user directly without a registration request."""
    serializer = UserCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()

    # Roles other than MINAGRI_OFFICER/ADMIN need a role-specific profile row (Cooperative,
    # Transporter, Distributor, MarketAgent, WarehouseManager) before they can use any
    # role feature — reuse the same helper the access-request approval flow uses, fed from
    # this request's own fields since there's no AccessRequest object here.
    from types import SimpleNamespace
    create_role_profile(user, SimpleNamespace(
        organization_name=request.data.get('organization_name', ''),
        district=request.data.get('district', ''),
        phone_number=request.data.get('phone_number', ''),
    ))

    otp_code, _ = create_otp_record(user, OTPRecord.Purpose.ACCOUNT_ACTIVATION)
    send_otp_email(user, otp_code, OTPRecord.Purpose.ACCOUNT_ACTIVATION)
    log_action(request.user, AuditLog.Action.ACCOUNT_CREATED,
               f"Directly created account for {user.get_full_name()} ({user.role})", request)
    return Response({
        "message": f"Account created. OTP sent to {user.email or user.phone_number}.",
        "user": UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_avatar(request):
    ALLOWED = ('image/jpeg', 'image/png', 'image/webp')
    MAX_BYTES = 5 * 1024 * 1024  # 5 MB

    f = request.FILES.get('avatar')
    if not f:
        return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
    if f.content_type not in ALLOWED:
        return Response({'detail': 'Only JPEG, PNG and WebP files are accepted.'}, status=status.HTTP_400_BAD_REQUEST)
    if f.size > MAX_BYTES:
        return Response({'detail': 'File too large. Maximum size is 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

    from PIL import Image
    img = Image.open(f)
    img = img.convert('RGB')
    img.thumbnail((400, 400), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    buf.seek(0)

    user = request.user
    if user.avatar:
        user.avatar.delete(save=False)

    filename = f"avatar_{user.id}.jpg"
    user.avatar.save(filename, ContentFile(buf.read()), save=True)

    avatar_url = request.build_absolute_uri(user.avatar.url)
    log_action(user, AuditLog.Action.DATA_UPDATED, "Avatar updated", request)
    return Response({'avatar': avatar_url, 'message': 'Avatar updated.'})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def forgot_password(request):
    credential = request.data.get("credential", "").strip()
    if not credential:
        return Response({"detail": "Phone number or email is required."}, status=status.HTTP_400_BAD_REQUEST)
    user = None
    try:
        user = User.objects.get(phone_number=credential)
    except User.DoesNotExist:
        try:
            user = User.objects.get(email=credential)
        except User.DoesNotExist:
            pass
    # Always return 200 to avoid revealing whether an account exists
    if user and user.is_active and user.is_verified:
        otp_code, _ = create_otp_record(user, OTPRecord.Purpose.PASSWORD_RESET)
        send_otp_email(user, otp_code, OTPRecord.Purpose.PASSWORD_RESET)
        log_action(user, AuditLog.Action.OTP_VERIFIED, "Password reset OTP requested", request)
    return Response({"detail": "If an account exists with that credential, a reset code has been sent."})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def resend_otp(request):
    """
    Resend an OTP to the user.
    Body: { credential: phone|email, purpose: ACCOUNT_ACTIVATION|PASSWORD_RESET }
    Always returns 200 to avoid account enumeration.
    """
    credential = request.data.get("credential", "").strip()
    purpose_str = request.data.get("purpose", "ACCOUNT_ACTIVATION")

    purpose_map = {
        "ACCOUNT_ACTIVATION": OTPRecord.Purpose.ACCOUNT_ACTIVATION,
        "PASSWORD_RESET":     OTPRecord.Purpose.PASSWORD_RESET,
        "MFA_LOGIN":          OTPRecord.Purpose.MFA_LOGIN,
    }
    purpose = purpose_map.get(purpose_str, OTPRecord.Purpose.ACCOUNT_ACTIVATION)

    user = None
    if credential:
        try:
            user = User.objects.get(phone_number=credential)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=credential)
            except User.DoesNotExist:
                pass

    if user and user.is_active:
        otp_code, _ = create_otp_record(user, purpose)
        send_otp_email(user, otp_code, purpose)
        log_action(user, AuditLog.Action.OTP_SENT, f"OTP resent for {purpose_str}", request)

    return Response({"detail": "If an account exists with that credential, a new code has been sent."})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by("-timestamp")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ["action", "user"]
