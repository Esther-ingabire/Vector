from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'batches', views.BatchViewSet, basename='batches')
router.register(r'scans', views.QRCodeScanEventViewSet, basename='scans')

urlpatterns = [
    path('track/<uuid:batch_id>/', views.PublicBatchTrackView.as_view(), name='public-batch-track'),
    path('', include(router.urls)),
]
