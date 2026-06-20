"""
Notification creation helper — used by other apps to push an in-app notification
to a user. Delivery happens via the existing SSE stream (views.notification_stream).
"""

from .models import Notification


def notify(recipient, notification_type, title, message,
           related_object_type='', related_object_id=''):
    """Create a Notification for `recipient`. No-op if recipient is None (missing profile)."""
    if recipient is None:
        return None
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_object_type=related_object_type,
        related_object_id=str(related_object_id) if related_object_id else '',
    )
