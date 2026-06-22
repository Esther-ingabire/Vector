"""
Role-based permission classes.
"""
from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsCooperativeManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "COOPERATIVE_MANAGER"


class IsTransporter(permissions.BasePermission):
    """Individual driver (TRANSPORTER) or Transport Company account — same shared functionality."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("TRANSPORTER", "TRANSPORT_COMPANY")


class IsDistributor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "DISTRIBUTOR"


class IsMarketAgent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "MARKET_AGENT"


class IsMINAGRIOfficer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "MINAGRI_OFFICER"


class IsWarehouseManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "WAREHOUSE_MANAGER"


class IsFieldRole(permissions.BasePermission):
    """Transporter, Transport Company, or Market Agent."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("TRANSPORTER", "TRANSPORT_COMPANY", "MARKET_AGENT")


class IsAnalyticsRole(permissions.BasePermission):
    """MINAGRI Officer or Admin."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("MINAGRI_OFFICER", "ADMIN")


class CanViewNationalAnalytics(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "MINAGRI_OFFICER"
