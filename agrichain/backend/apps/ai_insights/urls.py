from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'insights', views.AIInsightViewSet, basename='ai-insights')
router.register(r'daily-brief', views.DailyBriefBundleViewSet, basename='daily-brief')

urlpatterns = [
    path('', include(router.urls)),
]
