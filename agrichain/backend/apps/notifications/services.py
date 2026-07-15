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


HIGH_SPOILAGE_THRESHOLD_PCT = 15.0  # matches the "red" threshold already shown in every waste report form


def notify_high_spoilage(source_label, source_name, loss_pct, related_object_type='', related_object_id=''):
    """
    Alert every MINAGRI officer when a submitted waste report (cooperative, distributor, or
    market agent) crosses the high-spoilage threshold. Without this, waste reports were
    recorded but nobody was ever actively told about them. MINAGRI only, not Admin — Admin's
    role is user management and data integration monitoring, not operational oversight of
    what individual cooperatives/distributors/market agents are doing.
    """
    if loss_pct is None or float(loss_pct) <= HIGH_SPOILAGE_THRESHOLD_PCT:
        return
    from apps.authentication.models import User
    recipients = User.objects.filter(role='MINAGRI_OFFICER', is_active=True)
    for user in recipients:
        notify(
            user,
            Notification.NotificationType.HIGH_SPOILAGE_ALERT,
            'High Spoilage Rate Reported',
            f'{source_label} "{source_name}" reported a {loss_pct}% spoilage rate — above the {HIGH_SPOILAGE_THRESHOLD_PCT}% threshold.',
            related_object_type=related_object_type, related_object_id=related_object_id,
        )
