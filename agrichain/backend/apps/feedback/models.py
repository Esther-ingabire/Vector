from django.db import models
from django.conf import settings


class Feedback(models.Model):
    class Mode(models.TextChoices):
        FEEDBACK = 'feedback', 'Feedback'
        HELP     = 'help',     'Help & Support'

    class Status(models.TextChoices):
        NEW      = 'new',      'New'
        READ     = 'read',     'Read'
        RESOLVED = 'resolved', 'Resolved'

    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='feedback_submissions')
    role       = models.CharField(max_length=30, blank=True)
    mode       = models.CharField(max_length=10, choices=Mode.choices, default=Mode.FEEDBACK)
    rating     = models.PositiveSmallIntegerField(null=True, blank=True)  # 1–5, feedback mode only
    message    = models.TextField()
    status     = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status', 'created_at'])]

    def __str__(self):
        return f"[{self.get_mode_display()}] {self.role} – {self.created_at:%Y-%m-%d}"
