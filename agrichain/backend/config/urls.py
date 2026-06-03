"""
ChainSight URL Configuration
All API routes are versioned under /api/v1/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/cooperatives/', include('apps.cooperatives.urls')),
    path('api/v1/transport/', include('apps.transport.urls')),
    path('api/v1/distribution/', include('apps.distribution.urls')),
    path('api/v1/market-agents/', include('apps.market_agents.urls')),
    path('api/v1/traceability/', include('apps.traceability.urls')),
    path('api/v1/predictions/', include('apps.predictions.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/ai-insights/', include('apps.ai_insights.urls')),
    path('api/v1/iot/', include('apps.iot.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
