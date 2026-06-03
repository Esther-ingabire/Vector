from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'agents', views.MarketAgentViewSet, basename='market-agents')
router.register(r'collections', views.CollectionConfirmationViewSet, basename='collections')
router.register(r'waste-reports', views.WasteReportViewSet, basename='waste-reports')

urlpatterns = [
    path('', include(router.urls)),
]
