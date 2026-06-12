from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Feedback
from .serializers import FeedbackSerializer


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', '') == 'ADMIN'


class FeedbackViewSet(viewsets.ModelViewSet):
    serializer_class   = FeedbackSerializer
    http_method_names  = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = Feedback.objects.select_related('user').all()
        mode   = self.request.query_params.get('mode')
        status = self.request.query_params.get('status')
        if mode:
            qs = qs.filter(mode=mode)
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def resolve(self, request, pk=None):
        item = self.get_object()
        note = request.data.get('admin_note', '')
        item.status     = Feedback.Status.RESOLVED
        item.admin_note = note
        item.save()
        return Response(FeedbackSerializer(item, context={'request': request}).data)
