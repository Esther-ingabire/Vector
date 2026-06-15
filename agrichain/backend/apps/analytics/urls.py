from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'national', views.NationalKPIViewSet, basename='national-kpi')
router.register(r'districts', views.DistrictKPIViewSet, basename='district-kpi')
router.register(r'reliability', views.CooperativeReliabilityViewSet, basename='reliability')
router.register(r'delivery-comparison', views.DeliveryMethodComparisonViewSet, basename='delivery-comparison')

urlpatterns = [
    path('', include(router.urls)),
    path('distribution/', views.DistributionAnalyticsView.as_view()),
    # MINAGRI live-compute endpoints
    path('minagri/executive/', views.MinagriExecutiveDashboardView.as_view(), name='minagri-executive'),
    path('minagri/districts/', views.MinagriDistrictPerformanceView.as_view(), name='minagri-districts'),
    path('minagri/loss-trend/', views.MinagriLossTrendView.as_view(), name='minagri-loss-trend'),
    path('minagri/bottlenecks/', views.MinagriBottleneckView.as_view(), name='minagri-bottlenecks'),
    path('minagri/notifications/', views.MinagriNotificationsView.as_view(), name='minagri-notifications'),
]
