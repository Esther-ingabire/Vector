"""
Transport models: Transporters, Vehicles, TransportRequests, Trips, GPS tracking.
"""

import uuid
from django.db import models
from django.conf import settings


class Transporter(models.Model):
    """
    A registered individual driver or logistics company.
    Linked to a User with TRANSPORTER role.
    """

    user         = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                        related_name='transporter_profile',
                                        limit_choices_to={'role__in': ['TRANSPORTER', 'TRANSPORT_COMPANY']})
    company_name = models.CharField(max_length=200, blank=True, help_text="Optional — for company registrations")
    operating_districts = models.JSONField(default=list, help_text="List of districts this transporter covers")
    registered_by_cooperative = models.ForeignKey(
        'cooperatives.Cooperative', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='registered_transporters',
    )
    registered_by_distributor = models.ForeignKey(
        'distribution.Distributor', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='registered_transporters',
    )
    parent_company = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='drivers',
        help_text="Set when this Transporter is a driver registered by a Transport Company account.",
    )

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.company_name or self.user.get_full_name()


class Vehicle(models.Model):
    """
    A vehicle owned or operated by a Transporter.
    Refrigerated vehicles may have an IoT temperature sensor (ESP32).
    """

    class VehicleType(models.TextChoices):
        REFRIGERATED = 'REFRIGERATED', 'Refrigerated Truck'
        STANDARD_TRUCK = 'STANDARD_TRUCK', 'Standard Truck'
        PICKUP       = 'PICKUP',       'Pickup Truck'
        MOTORCYCLE   = 'MOTORCYCLE',   'Motorcycle'
        MINIBUS      = 'MINIBUS',      'Minibus'

    transporter          = models.ForeignKey(Transporter, on_delete=models.CASCADE, related_name='vehicles')
    vehicle_type         = models.CharField(max_length=20, choices=VehicleType.choices)
    plate_number         = models.CharField(max_length=20, unique=True)
    capacity_kg          = models.DecimalField(max_digits=8, decimal_places=2)
    operating_districts  = models.JSONField(default=list)

    has_iot_temperature  = models.BooleanField(default=False)
    iot_device_id        = models.CharField(max_length=100, blank=True)

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['plate_number']

    def __str__(self):
        return f"{self.plate_number} ({self.vehicle_type}) — {self.transporter}"


class TransportRequest(models.Model):
    """
    A request for transport sent to a transporter by a cooperative (Leg 1)
    or a distributor (Leg 2).
    """

    class Status(models.TextChoices):
        PENDING     = 'PENDING',     'Pending Transporter Response'
        ACCEPTED    = 'ACCEPTED',    'Accepted'
        DECLINED    = 'DECLINED',    'Declined'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED   = 'COMPLETED',   'Completed'
        CANCELLED   = 'CANCELLED',   'Cancelled'

    class Leg(models.IntegerChoices):
        LEG_1 = 1, 'Leg 1 — Cooperative to Distributor'
        LEG_2 = 2, 'Leg 2 — Distributor to Market Agent'

    # Requester — either cooperative or distributor (one must be set)
    requested_by_cooperative = models.ForeignKey(
        'cooperatives.Cooperative', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='transport_requests_sent'
    )
    requested_by_distributor = models.ForeignKey(
        'distribution.Distributor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='transport_requests_sent'
    )

    transporter = models.ForeignKey(Transporter, on_delete=models.PROTECT, related_name='transport_requests')
    vehicle     = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='transport_requests')
    leg_number  = models.IntegerField(choices=Leg.choices)

    # Multi-stop run: a single pickup feeding several drop-offs for the same transporter in one
    # go (e.g. a cooperative dispatching different crops to several distributors on one truck).
    # All requests sharing a run_id are otherwise independent — each keeps its own status, Trip,
    # and delivery confirmation; only the pickup and transporter are shared.
    run_id       = models.UUIDField(null=True, blank=True, db_index=True,
                                     help_text="Shared by all stops in the same multi-stop run.")
    stop_sequence = models.PositiveIntegerField(null=True, blank=True,
                                     help_text="Order of this stop within its run (1 = first).")

    # Route
    pickup_location    = models.CharField(max_length=300)
    pickup_gps_lat     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_gps_lng     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    destination        = models.CharField(max_length=300)
    destination_gps_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    destination_gps_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Cargo
    cargo_description       = models.CharField(max_length=200)
    estimated_cargo_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    requires_refrigeration  = models.BooleanField(default=False)
    required_pickup_datetime = models.DateTimeField()

    # Response
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    decline_reason = models.TextField(blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Transport Request #{self.id} — Leg {self.leg_number} — {self.status}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.requested_by_cooperative and not self.requested_by_distributor:
            raise ValidationError("A transport request must be from a cooperative or a distributor.")


class Trip(models.Model):
    """
    An active or completed trip. Created when a TransportRequest is accepted and pickup is confirmed.
    """

    transport_request        = models.OneToOneField(TransportRequest, on_delete=models.PROTECT, related_name='trip')
    actual_pickup_datetime   = models.DateTimeField(null=True, blank=True)
    actual_delivery_datetime = models.DateTimeField(null=True, blank=True)
    pickup_confirmed_at      = models.DateTimeField(null=True, blank=True)
    delivery_confirmed_at    = models.DateTimeField(null=True, blank=True)
    delivery_notes           = models.TextField(blank=True)
    delay_alert_sent         = models.BooleanField(default=False, help_text="Set once a 'no recent GPS update' alert has fired for this trip.")
    created_at               = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trip for Request #{self.transport_request_id}"

    @property
    def transit_duration_hours(self):
        if self.actual_pickup_datetime and self.actual_delivery_datetime:
            delta = self.actual_delivery_datetime - self.actual_pickup_datetime
            return round(delta.total_seconds() / 3600, 2)
        return None


class IncidentReport(models.Model):
    """
    An unplanned incident (flat tire, accident, breakdown, road closure) reported by the
    transporter mid-trip. Triggers a notification to whoever requested that leg
    (the cooperative or distributor) so they can react before the delay surprises them.
    """

    class IncidentType(models.TextChoices):
        FLAT_TIRE    = 'FLAT_TIRE',    'Flat Tire'
        ACCIDENT     = 'ACCIDENT',     'Accident'
        BREAKDOWN    = 'BREAKDOWN',    'Vehicle Breakdown'
        ROAD_CLOSURE = 'ROAD_CLOSURE', 'Road Closure / Detour'
        OTHER        = 'OTHER',        'Other'

    trip           = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='incident_reports')
    incident_type  = models.CharField(max_length=20, choices=IncidentType.choices)
    description    = models.TextField(blank=True)
    gps_lat        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_lng        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    resolved       = models.BooleanField(default=False)
    reported_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reported_at']

    def __str__(self):
        return f"{self.get_incident_type_display()} on Trip #{self.trip_id}"


class GPSTrack(models.Model):
    """
    GPS location records for a trip. Posted from the transporter's mobile device every 2 minutes.
    """

    trip        = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='gps_tracks')
    latitude    = models.DecimalField(max_digits=9, decimal_places=6)
    longitude   = models.DecimalField(max_digits=9, decimal_places=6)
    speed_kmh   = models.FloatField(null=True, blank=True)
    timestamp   = models.DateTimeField()

    class Meta:
        ordering = ['timestamp']
        indexes = [models.Index(fields=['trip', 'timestamp'])]

    def __str__(self):
        return f"GPS({self.latitude},{self.longitude}) at {self.timestamp}"
