from celery import shared_task

# Minutes of silence from a transporter's phone before we flag a trip as possibly delayed.
# GPSTrack is posted every ~2 minutes in normal operation, so 30 minutes of silence is a
# strong signal something went wrong (dead phone, no signal, vehicle stopped/broken down).
DELAY_THRESHOLD_MINUTES = 30


@shared_task
def check_trip_delays():
    """
    Rule-based delay heuristic (not ML): flag any in-progress trip whose last GPS ping
    (or pickup confirmation, if no ping yet) is older than DELAY_THRESHOLD_MINUTES, and
    notify whoever requested that leg. One alert per trip — `delay_alert_sent` prevents repeats.
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import Trip, TransportRequest
    from apps.notifications.models import Notification
    from apps.notifications.services import notify

    threshold = timezone.now() - timedelta(minutes=DELAY_THRESHOLD_MINUTES)
    candidates = Trip.objects.filter(
        transport_request__status=TransportRequest.Status.IN_PROGRESS,
        delivery_confirmed_at__isnull=True,
        delay_alert_sent=False,
    ).select_related(
        'transport_request__requested_by_cooperative__manager',
        'transport_request__requested_by_distributor__user',
        'transport_request__transporter',
    )

    flagged = 0
    for trip in candidates:
        last_ping = trip.gps_tracks.order_by('-timestamp').first()
        reference_time = last_ping.timestamp if last_ping else trip.pickup_confirmed_at
        if reference_time is None or reference_time > threshold:
            continue

        req = trip.transport_request
        recipient = None
        if req.requested_by_cooperative_id:
            recipient = req.requested_by_cooperative.manager
        elif req.requested_by_distributor_id:
            recipient = req.requested_by_distributor.user

        notify(
            recipient,
            Notification.NotificationType.TRIP_DELAY_ALERT,
            'Possible Delay on Trip',
            f'No GPS update from {req.transporter} since '
            f'{reference_time.strftime("%H:%M")} on the trip to {req.destination}. Worth checking in.',
            related_object_type='trip', related_object_id=trip.id,
        )
        trip.delay_alert_sent = True
        trip.save(update_fields=['delay_alert_sent'])
        flagged += 1

    return f"{flagged} trip(s) flagged as possibly delayed."
