from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r"access-requests", views.AccessRequestAdminViewSet, basename="access-requests")
router.register(r"users", views.UserViewSet, basename="users")
router.register(r"audit-logs", views.AuditLogViewSet, basename="audit-logs")

urlpatterns = [
    # Must be before router.urls — the router's users/{pk}/ pattern would
    # otherwise match "create" as a pk value and return 405 for POST.
    path("users/create/", views.create_user_directly, name="create-user"),
    path("", include(router.urls)),
    path("login/", views.login_view, name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("otp/verify/", views.verify_otp, name="verify-otp"),
    path("set-password/", views.set_password, name="set-password"),
    path("request-access/", views.request_access, name="request-access"),
    path("access-requests/<int:access_request_id>/approve/", views.approve_and_create_user, name="approve-request"),
    path("access-requests/<int:access_request_id>/reject/", views.reject_access_request, name="reject-request"),
    path("me/", views.me, name="me"),
    path("forgot-password/", views.forgot_password, name="forgot-password"),
    path("otp/resend/", views.resend_otp, name="resend-otp"),
    path("me/avatar/", views.upload_avatar, name="upload-avatar"),
    path("mfa/request-otp/", views.mfa_request_enable_otp, name="mfa-request-otp"),
    path("mfa/enable/", views.mfa_enable, name="mfa-enable"),
    path("mfa/disable/", views.mfa_disable, name="mfa-disable"),
    path("data-integration-status/", views.data_integration_status, name="data-integration-status"),
]
