from django.contrib import admin
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display  = ['id', 'mode', 'role', 'user', 'rating', 'status', 'created_at']
    list_filter   = ['mode', 'status', 'role']
    search_fields = ['message', 'user__phone_number', 'user__first_name']
    readonly_fields = ['user', 'role', 'mode', 'rating', 'message', 'created_at']
    ordering      = ['-created_at']
