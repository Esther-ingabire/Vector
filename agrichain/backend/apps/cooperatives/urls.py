from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'crops', views.CropViewSet, basename='crops')
router.register(r'', views.CooperativeViewSet, basename='cooperatives')
router.register(r'stock', views.CooperativeStockViewSet, basename='stock')
router.register(r'facilities', views.ColdStorageFacilityViewSet, basename='facilities')

urlpatterns = [
    path('', include(router.urls)),
]
