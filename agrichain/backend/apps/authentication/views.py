"""
Authentication views: login, OTP verify, set password, access requests, user management.
"""
import hashlib, random, string
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, AccessRequest, OTPRecord, AuditLog
from .serializers import (
    LoginSerializer, OTPVerifySerializer, SetPasswordSerializer,
    AccessRequestSerializer, AccessRequestAdminSerializer,
    UserSerializer, UserCreateSerializer, AuditLogSerializer
)
from .permissions import IsAdminRole


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
    refresh = RefreshToken.for_user(user)
    log_action(user, AuditLog.Action.LOGIN, f"User logged in from {get_client_ip(request)}", request)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
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

    purpose = serializer.validated_data["purpose"]
    if purpose == OTPRecord.Purpose.ACCOUNT_ACTIVATION:
        user.is_verified = True
        user.save(update_fields=["is_verified"])

    log_action(user, AuditLog.Action.OTP_VERIFIED, f"OTP verified for purpose: {purpose}", request)

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


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by("-timestamp")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ["action", "user"]
