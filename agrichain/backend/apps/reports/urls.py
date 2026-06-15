from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.ReportViewSet, basename='reports')

urlpatterns = [
    path('export/', views.ExportReportView.as_view(), name='report-export'),
    path('', include(router.urls)),
]
