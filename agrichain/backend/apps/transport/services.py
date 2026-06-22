"""
Shared business logic reused by multiple apps' "fleet monitoring" endpoints —
Transport Companies monitoring their drivers, and Cooperatives/Distributors
monitoring drivers they registered and own directly.
"""


def fleet_monitoring_rows(transporter_ids):
    """
    Vehicle IoT temperature readings + incident status across the active trips
    of the given list of Transporter ids. Returns a list of plain dicts, ready
    to serialize directly in a Response.
    """
    from apps.iot.models import VehicleIoTReading
    from .models import Trip, TransportRequest, IncidentReport

    trips = Trip.objects.select_related('transport_request__transporter__user').filter(
        transport_request__transporter_id__in=transporter_ids,
        transport_request__status__in=[TransportRequest.Status.ACCEPTED, TransportRequest.Status.IN_PROGRESS],
    ).order_by('-created_at')

    results = []
    for trip in trips:
        req = trip.transport_request
        readings = VehicleIoTReading.objects.filter(trip=trip).order_by('-timestamp')
        latest = readings.first()
        results.append({
            'trip_id': trip.id,
            'driver_name': str(req.transporter),
            'pickup_location': req.pickup_location,
            'destination': req.destination,
            'requires_refrigeration': req.requires_refrigeration,
            'latest_temperature': latest.temperature_celsius if latest else None,
            'latest_temperature_at': latest.timestamp if latest else None,
            'is_breach': latest.is_breach if latest else False,
            'breach_count': readings.filter(is_breach=True).count(),
            'open_incidents': IncidentReport.objects.filter(trip=trip, resolved=False).count(),
        })
    return results
