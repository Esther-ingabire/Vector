from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'batches', views.BatchViewSet, basename='batches')
router.register(r'scans', views.QRCodeScanEventViewSet, basename='scans')

urlpatterns = [
    path('', include(router.urls)),
]
