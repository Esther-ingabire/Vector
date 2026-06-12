from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'crops', views.CropViewSet, basename='crops')
router.register(r'stock', views.CooperativeStockViewSet, basename='stock')
router.register(r'facilities', views.ColdStorageFacilityViewSet, basename='facilities')
router.register(r'', views.CooperativeViewSet, basename='cooperatives')

urlpatterns = [
    # Function views must come BEFORE router include — the blank-prefix CooperativeViewSet
    # would otherwise catch them as pk lookups (causing 405/404 errors).
    path('register-transporter/', views.register_transporter, name='register-transporter'),
    path('my-transporters/<int:pk>/', views.manage_transporter, name='manage-transporter'),
    path('', include(router.urls)),
]
