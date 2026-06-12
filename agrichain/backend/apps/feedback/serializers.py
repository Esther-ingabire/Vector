from rest_framework import serializers
from .models import Feedback


class FeedbackSerializer(serializers.ModelSerializer):
    user_name  = serializers.SerializerMethodField(read_only=True)
    user_phone = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Feedback
        fields = [
            'id', 'user_name', 'user_phone', 'role',
            'mode', 'rating', 'message',
            'status', 'admin_note', 'created_at',
        ]
        read_only_fields = ['id', 'user_name', 'user_phone', 'role', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return 'Unknown'

    def get_user_phone(self, obj):
        return obj.user.phone_number if obj.user else '—'

    def create(self, validated_data):
        request = self.context['request']
        validated_data['user'] = request.user
        validated_data['role'] = getattr(request.user, 'role', '')
        return super().create(validated_data)
