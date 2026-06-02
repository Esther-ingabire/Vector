"""
Authentication models.
Custom User model with 6 roles + AccessRequest + OTPRecord + AuditLog.
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


class User(AbstractUser):
    """
    Custom User model. Role determines which dashboard and data the user can access.
    Accounts are created ONLY by the System Administrator — no self-registration.
    """

    class Role(models.TextChoices):
        ADMIN               = 'ADMIN',              'System Administrator'
        COOPERATIVE_MANAGER = 'COOPERATIVE_MANAGER', 'Cooperative Manager'
        TRANSPORTER         = 'TRANSPORTER',         'Transporter'
        DISTRIBUTOR         = 'DISTRIBUTOR',         'Distributor'
        MARKET_AGENT        = 'MARKET_AGENT',        'Market Agent'
        MINAGRI_OFFICER     = 'MINAGRI_OFFICER',     'MINAGRI Officer'

    class Language(models.TextChoices):
        ENGLISH    = 'EN', 'English'
        KINYARWANDA = 'RW', 'Kinyarwanda'

    # Override email to be required
    email = models.EmailField(unique=True, null=True, blank=True)

    role = models.CharField(max_length=30, choices=Role.choices)
    phone_number = models.CharField(max_length=20, unique=True)
    organization_name = models.CharField(max_length=200, blank=True)
    district = models.CharField(max_length=100, blank=True)
    language_preference = models.CharField(max_length=2, choices=Language.choices, default=Language.ENGLISH)

    # Account state
    is_verified = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=True)  # True until first login password change
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    # MFA — optional for most, recommended for MINAGRI
    mfa_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    REQUIRED_FIELDS = ['email', 'role', 'phone_number']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.role}) — {self.phone_number}"

    def is_locked(self):
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False

    def record_failed_login(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            self.locked_until = timezone.now() + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
        self.save(update_fields=['failed_login_attempts', 'locked_until'])

    def reset_failed_logins(self):
        self.failed_login_attempts = 0
        self.locked_until = None
        self.save(update_fields=['failed_login_attempts', 'locked_until'])


class AccessRequest(models.Model):
    """
    Public registration request submitted before admin creates an account.
    This is NOT the account — it is a request that the admin reviews.
    """

    class Status(models.TextChoices):
        PENDING  = 'PENDING',  'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    # Applicant details
    full_name = models.CharField(max_length=200)
    role_requested = models.CharField(max_length=30, choices=User.Role.choices)
    organization_name = models.CharField(max_length=200)
    district = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True)

    # Uploaded documents (stored as separate DocumentUpload records)
    acknowledgement = models.BooleanField(default=False)  # Applicant acknowledged admin review

    # Admin review
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    admin_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Created account (linked after approval)
    created_user = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='access_request'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} — {self.role_requested} ({self.status})"


class DocumentUpload(models.Model):
    """Supporting documents attached to an AccessRequest."""

    class DocumentType(models.TextChoices):
        NATIONAL_ID          = 'NATIONAL_ID',          'National ID'
        COOPERATIVE_REG      = 'COOPERATIVE_REG',      'Cooperative Registration'
        DRIVERS_LICENSE      = 'DRIVERS_LICENSE',      "Driver's Licence"
        VEHICLE_LOGBOOK      = 'VEHICLE_LOGBOOK',      'Vehicle Logbook'
        COMPANY_REGISTRATION = 'COMPANY_REGISTRATION', 'Company Registration'
        OTHER                = 'OTHER',                'Other'

    access_request = models.ForeignKey(AccessRequest, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file = models.FileField(upload_to='documents/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document_type} for {self.access_request.full_name}"


class OTPRecord(models.Model):
    """
    One-time password records for account activation, password reset, and MFA.
    OTPs expire after OTP_EXPIRY_HOURS (24h default) and are single-use.
    """

    class Purpose(models.TextChoices):
        ACCOUNT_ACTIVATION = 'ACCOUNT_ACTIVATION', 'Account Activation'
        PASSWORD_RESET     = 'PASSWORD_RESET',     'Password Reset'
        MFA_LOGIN          = 'MFA_LOGIN',           'MFA Login'
        CONTACT_CHANGE     = 'CONTACT_CHANGE',      'Contact Details Change'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_records')
    otp_code = models.CharField(max_length=128)  # Stored as hash
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def is_expired(self):
        return timezone.now() > self.expires_at

    def is_valid(self):
        return not self.is_used and not self.is_expired()

    def __str__(self):
        return f"OTP for {self.user.phone_number} — {self.purpose}"


class AuditLog(models.Model):
    """
    Immutable audit trail of all system actions.
    Append-only — no records should ever be deleted or modified.
    """

    class Action(models.TextChoices):
        LOGIN              = 'LOGIN',              'User Login'
        LOGOUT             = 'LOGOUT',             'User Logout'
        FAILED_LOGIN       = 'FAILED_LOGIN',       'Failed Login Attempt'
        ACCOUNT_CREATED    = 'ACCOUNT_CREATED',    'Account Created'
        ACCOUNT_SUSPENDED  = 'ACCOUNT_SUSPENDED',  'Account Suspended'
        ACCOUNT_ACTIVATED  = 'ACCOUNT_ACTIVATED',  'Account Activated'
        PASSWORD_CHANGED   = 'PASSWORD_CHANGED',   'Password Changed'
        OTP_SENT           = 'OTP_SENT',           'OTP Sent'
        OTP_VERIFIED       = 'OTP_VERIFIED',       'OTP Verified'
        DATA_CREATED       = 'DATA_CREATED',       'Record Created'
        DATA_UPDATED       = 'DATA_UPDATED',       'Record Updated'
        DATA_DELETED       = 'DATA_DELETED',       'Record Deleted'
        REPORT_GENERATED   = 'REPORT_GENERATED',   'Report Generated'
        REPORT_DOWNLOADED  = 'REPORT_DOWNLOADED',  'Report Downloaded'
        BATCH_DISPATCHED   = 'BATCH_DISPATCHED',   'Batch Dispatched'
        BATCH_RECEIVED     = 'BATCH_RECEIVED',     'Batch Received'
        WASTE_REPORT       = 'WASTE_REPORT',       'Waste Report Submitted'
        PERMISSION_DENIED  = 'PERMISSION_DENIED',  'Permission Denied'

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=30, choices=Action.choices)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # For DATA_CREATED / DATA_UPDATED / DATA_DELETED — which object was affected
    content_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)

    # Before/after values for sensitive field changes
    before_value = models.JSONField(null=True, blank=True)
    after_value = models.JSONField(null=True, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        # Prevent any modification of audit records
        default_permissions = ('view',)

    def __str__(self):
        user_str = self.user.phone_number if self.user else 'Anonymous'
        return f"{self.action} by {user_str} at {self.timestamp}"
