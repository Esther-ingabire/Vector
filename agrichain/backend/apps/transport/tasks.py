from celery import shared_task

# Minutes of silence from a transporter's phone before we flag a trip as possibly delayed.
# GPSTrack is posted every ~2 minutes in normal operation, so 30 minutes of silence is a
# strong signal something went wrong (dead phone, no signal, vehicle stopped/broken down).
DELAY_THRESHOLD_MINUTES = 30

# Fraction of the pickup-to-destination distance to advance per simulated tick — at the
# 2-minute schedule below, a trip reaches its destination in roughly 30-35 minutes, which
# keeps a live demo watchable without an unrealistically instant arrival.
GPS_STEP_FRACTION = 0.06


@shared_task
def simulate_gps_tracks():
    """
    Moves a simulated vehicle marker from pickup towards destination for every trip that's
    actually under way (pickup confirmed, delivery not yet confirmed) and has GPS coordinates
    on both ends. Mirrors `apps.iot.tasks.simulate_sensor_readings` — same role, same caveat:
    this exists because no physical device (or the mobile app's GPS reporting) is currently
    wired up to actually call `POST /api/v1/transport/gps/`. Swapping in a real source later
    requires no changes here; it would simply mean this task finds nothing left to simulate
    once GPSTrack rows are arriving from elsewhere.
    """
    import random
    from decimal import Decimal
    from django.utils import timezone
    from .models import Trip, GPSTrack

    now = timezone.now()
    moved = 0

    active_trips = Trip.objects.filter(
        pickup_confirmed_at__isnull=False,
        delivery_confirmed_at__isnull=True,
    ).select_related('transport_request')

    for trip in active_trips:
        req = trip.transport_request
        if not (req.pickup_gps_lat and req.pickup_gps_lng and req.destination_gps_lat and req.destination_gps_lng):
            continue

        pickup = (float(req.pickup_gps_lat), float(req.pickup_gps_lng))
        destination = (float(req.destination_gps_lat), float(req.destination_gps_lng))

        ticks_so_far = trip.gps_tracks.count()
        progress = min(1.0, (ticks_so_far + 1) * GPS_STEP_FRACTION)
        if progress >= 1.0 and ticks_so_far > 0:
            # Already arrived in a previous tick — nothing left to simulate for this trip.
            last = trip.gps_tracks.order_by('-timestamp').first()
            if last and (float(last.latitude), float(last.longitude)) == destination:
                continue

        lat = pickup[0] + (destination[0] - pickup[0]) * progress
        lng = pickup[1] + (destination[1] - pickup[1]) * progress

        # Small perpendicular jitter so the path isn't a perfectly straight ruled line.
        jitter = random.gauss(0, 0.0008)
        dx, dy = destination[0] - pickup[0], destination[1] - pickup[1]
        length = (dx ** 2 + dy ** 2) ** 0.5 or 1
        lat += -dy / length * jitter
        lng += dx / length * jitter

        GPSTrack.objects.create(
            trip=trip,
            latitude=Decimal(str(round(lat, 6))),
            longitude=Decimal(str(round(lng, 6))),
            speed_kmh=round(40 + random.gauss(0, 12), 1),
            timestamp=now,
        )
        moved += 1

    return f"Advanced {moved} simulated GPS track(s) at {now.strftime('%H:%M')}"


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
