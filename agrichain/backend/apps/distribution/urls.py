from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'distributors', views.DistributorViewSet, basename='distributors')
router.register(r'produce-requests', views.ProduceRequestViewSet, basename='produce-requests')
router.register(r'collection-notices', views.CollectionNoticeViewSet, basename='collection-notices')
router.register(r'orders', views.OrderViewSet, basename='orders')

urlpatterns = [
    path('', include(router.urls)),
]
