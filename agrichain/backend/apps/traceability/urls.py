from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# register viewsets here: router.register(r'resource', views.ResourceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
