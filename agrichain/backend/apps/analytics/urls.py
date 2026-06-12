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
]
