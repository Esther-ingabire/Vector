"""
Authentication serializers: login, OTP, registration requests, user profile.
"""
from django.utils import timezone
from rest_framework import serializers
from .models import User, AccessRequest, DocumentUpload, OTPRecord, AuditLog
import hashlib, secrets


class LoginSerializer(serializers.Serializer):
    credential = serializers.CharField(help_text="Phone number or email")
    password   = serializers.CharField(write_only=True)

    def validate(self, data):
        credential = data["credential"].strip()
        user = None
        try:
            user = User.objects.get(phone_number=credential)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=credential)
            except User.DoesNotExist:
                pass
        if user is None:
            raise serializers.ValidationError({"credential": "No account found."})
        if user.is_locked():
            locked_time = user.locked_until.strftime("%H:%M")
            raise serializers.ValidationError({"credential": f"Account locked until {locked_time}"})
        if not user.check_password(data["password"]):
            user.record_failed_login()
            raise serializers.ValidationError({"password": "Incorrect password."})
        if not user.is_active:
            raise serializers.ValidationError({"credential": "Account suspended."})
        if not user.is_verified:
            raise serializers.ValidationError({"credential": "Account not activated. Check your email for OTP."})
        user.reset_failed_logins()
        data["user"] = user
        return data


class OTPVerifySerializer(serializers.Serializer):
    credential = serializers.CharField(help_text="Phone number or email")
    otp_code   = serializers.CharField(max_length=6, min_length=6)
    purpose    = serializers.ChoiceField(
        choices=OTPRecord.Purpose.choices,
        default=OTPRecord.Purpose.ACCOUNT_ACTIVATION,
        required=False,
    )

    def validate(self, data):
        credential = data["credential"].strip()
        user = None
        try:
            user = User.objects.get(phone_number=credential)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=credential)
            except User.DoesNotExist:
                pass
        if user is None:
            raise serializers.ValidationError({"credential": "No account with this phone number or email."})

        purpose = data.get("purpose") or OTPRecord.Purpose.ACCOUNT_ACTIVATION
        otp_hash = hashlib.sha256(data["otp_code"].encode()).hexdigest()
        try:
            otp_record = OTPRecord.objects.filter(user=user, purpose=purpose, is_used=False).latest("created_at")
        except OTPRecord.DoesNotExist:
            raise serializers.ValidationError({"otp_code": "No active OTP found. Contact your administrator."})
        if otp_record.otp_code != otp_hash:
            raise serializers.ValidationError({"otp_code": "Incorrect OTP code."})
        if otp_record.is_expired():
            raise serializers.ValidationError({"otp_code": "OTP has expired. Contact your administrator for a new one."})
        data["user"] = user
        data["otp_record"] = otp_record
        return data


class SetPasswordSerializer(serializers.Serializer):
    new_password     = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data


class AccessRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AccessRequest
        fields = ["id","full_name","role_requested","organization_name","district","phone_number","email","acknowledgement","status","created_at"]
        read_only_fields = ["id","status","created_at"]

    def validate(self, data):
        if not data.get("acknowledgement"):
            raise serializers.ValidationError({"acknowledgement": "You must acknowledge admin review."})
        if AccessRequest.objects.filter(phone_number=data["phone_number"], status=AccessRequest.Status.PENDING).exists():
            raise serializers.ValidationError({"phone_number": "A pending request already exists for this phone."})
        return data


class AccessRequestAdminSerializer(serializers.ModelSerializer):
    documents = serializers.SerializerMethodField()
    class Meta:
        model  = AccessRequest
        fields = "__all__"
    def get_documents(self, obj):
        return [{"id": d.id, "type": d.document_type, "url": d.file.url} for d in obj.documents.all()]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["id","username","first_name","last_name","email","phone_number","role","organization_name","district","language_preference","is_active","is_verified","must_change_password","mfa_enabled","created_at"]
        read_only_fields = ["id","role","is_verified","must_change_password","created_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["username","first_name","last_name","email","phone_number","role","organization_name","district","language_preference"]

    def create(self, validated_data):
        temp_password = secrets.token_urlsafe(16)
        user = User(**validated_data)
        user.set_password(temp_password)
        user.must_change_password = True
        user.is_verified = False
        user.is_active = True
        user.save()
        return user


class AuditLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()
    class Meta:
        model  = AuditLog
        fields = ["id","user","user_display","action","description","ip_address","content_type","object_id","timestamp"]
    def get_user_display(self, obj):
        return f"{obj.user.get_full_name()} ({obj.user.phone_number})" if obj.user else "Anonymous"
