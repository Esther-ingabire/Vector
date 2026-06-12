from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'distributors', views.DistributorViewSet, basename='distributors')
router.register(r'produce-requests', views.ProduceRequestViewSet, basename='produce-requests')
router.register(r'collection-notices', views.CollectionNoticeViewSet, basename='collection-notices')
router.register(r'notices', views.CollectionNoticeViewSet, basename='notices')  # alias used by frontend
router.register(r'orders', views.OrderViewSet, basename='orders')

urlpatterns = [
    path('', include(router.urls)),
    # Market agent link management
    path('market-agents/', views.MarketAgentListView.as_view()),
    path('market-agents/link/', views.MarketAgentLinkView.as_view()),
    path('market-agents/link/<int:link_id>/', views.MarketAgentUnlinkView.as_view()),
]
