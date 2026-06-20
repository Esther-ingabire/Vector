from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transporters', views.TransporterViewSet, basename='transporters')
router.register(r'vehicles', views.VehicleViewSet, basename='vehicles')
router.register(r'requests', views.TransportRequestViewSet, basename='transport-requests')
router.register(r'trips', views.TripViewSet, basename='trips')
router.register(r'gps', views.GPSTrackViewSet, basename='gps')
router.register(r'incidents', views.IncidentReportViewSet, basename='incidents')

urlpatterns = [
    path('', include(router.urls)),
]
