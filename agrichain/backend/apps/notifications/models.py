"""
Notification models: In-app notifications for all roles.
"""

from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    In-app notification delivered to a specific user.
    Push notifications to React Native are handled via Expo Push Notification Service.
    """

    class NotificationType(models.TextChoices):
        # Cooperative Manager
        PRODUCE_REQUEST_RECEIVED    = 'PRODUCE_REQUEST_RECEIVED',   'New Produce Request Received'
        TRANSPORT_ACCEPTED          = 'TRANSPORT_ACCEPTED',         'Transport Request Accepted'
        DELIVERY_CONFIRMED          = 'DELIVERY_CONFIRMED',         'Batch Delivered to Distributor'
        STORAGE_ALERT               = 'STORAGE_ALERT',              'Cold Storage Temperature Alert'
        # Transporter
        TRANSPORT_REQUEST_RECEIVED  = 'TRANSPORT_REQUEST_RECEIVED', 'New Transport Request'
        COLD_CHAIN_ALERT            = 'COLD_CHAIN_ALERT',           'Cold Chain Temperature Breach'
        INCIDENT_REPORTED           = 'INCIDENT_REPORTED',          'Transporter Reported an Incident'
        TRIP_DELAY_ALERT            = 'TRIP_DELAY_ALERT',           'Possible Delay — No Recent GPS Update'
        # Warehouse Manager / Cooperative (storage rental)
        WAREHOUSE_RENTAL_REQUESTED  = 'WAREHOUSE_RENTAL_REQUESTED', 'New Warehouse Rental Request'
        WAREHOUSE_RENTAL_RESPONSE   = 'WAREHOUSE_RENTAL_RESPONSE',  'Warehouse Rental Request Update'
        # Distributor
        COOP_RESPONSE               = 'COOP_RESPONSE',              'Cooperative Responded to Request'
        BATCH_IN_TRANSIT            = 'BATCH_IN_TRANSIT',           'Batch Is Now In Transit'
        BATCH_DELIVERED             = 'BATCH_DELIVERED',            'Batch Arrived — Confirm Receipt'
        AGENT_COLLECTION_CONFIRMED  = 'AGENT_COLLECTION_CONFIRMED', 'Market Agent Collected Produce'
        # Market Agent
        COLLECTION_NOTICE_AVAILABLE = 'COLLECTION_NOTICE_AVAILABLE', 'New Collection Notice Available'
        ORDER_CONFIRMED             = 'ORDER_CONFIRMED',              'Order Confirmed by Distributor'
        ORDER_DECLINED              = 'ORDER_DECLINED',               'Order Declined by Distributor'
        COLLECTION_RISK_ALERT       = 'COLLECTION_RISK_ALERT',        'High Risk Collection Advisory'
        # MINAGRI
        DISTRICT_THRESHOLD_BREACH   = 'DISTRICT_THRESHOLD_BREACH',   'District Loss Threshold Exceeded'
        SEASONAL_LOSS_PREDICTION    = 'SEASONAL_LOSS_PREDICTION',    'Seasonal High-Loss Prediction'
        NEW_REPORT_AVAILABLE        = 'NEW_REPORT_AVAILABLE',        'New Report Available for Download'
        # System-wide
        SYSTEM_ANNOUNCEMENT         = 'SYSTEM_ANNOUNCEMENT',        'System Announcement'

    recipient         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=40, choices=NotificationType.choices)
    title             = models.CharField(max_length=200)
    message           = models.TextField()

    # Link to the related object (for deep linking in the mobile app)
    related_object_type = models.CharField(max_length=50, blank=True)  # e.g. 'batch', 'order', 'report'
    related_object_id   = models.CharField(max_length=100, blank=True) # e.g. batch UUID

    is_read    = models.BooleanField(default=False)
    read_at    = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', 'is_read', 'created_at'])]

    def __str__(self):
        return f"[{self.notification_type}] → {self.recipient.phone_number}: {self.title}"
