from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'storage', views.IoTReadingViewSet, basename='iot-storage')
router.register(r'vehicle', views.VehicleIoTReadingViewSet, basename='iot-vehicle')

urlpatterns = [
    path('', include(router.urls)),
]
