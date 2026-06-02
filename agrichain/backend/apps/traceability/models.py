"""
Traceability models: Batch (core record), HandoverRecord, LossRecord.
The Batch is the central entity — every supply chain event references it.
"""

import uuid
from django.db import models


class Batch(models.Model):
    """
    Core traceability record for a produce batch.
    Created at cooperative dispatch. A QR code is generated for the batch.
    Every subsequent handover event references this batch.
    """

    class Status(models.TextChoices):
        AT_COOPERATIVE    = 'AT_COOPERATIVE',    'At Cooperative — Awaiting Dispatch'
        IN_TRANSIT_LEG1   = 'IN_TRANSIT_LEG1',   'In Transit — Leg 1 (Cooperative → Distributor)'
        AT_DISTRIBUTOR    = 'AT_DISTRIBUTOR',    'At Distributor'
        IN_TRANSIT_LEG2   = 'IN_TRANSIT_LEG2',   'In Transit — Leg 2 (Distributor → Market Agent)'
        AT_MARKET         = 'AT_MARKET',         'At Market Agent Stall'
        COMPLETED         = 'COMPLETED',         'Completed — Waste Report Submitted'

    class QualityGrade(models.TextChoices):
        GRADE_A = 'A', 'Grade A — Premium'
        GRADE_B = 'B', 'Grade B — Standard'
        GRADE_C = 'C', 'Grade C — Below Standard'

    # Unique identifier — used in QR codes
    batch_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)

    # Traceability anchor
    supply_agreement = models.ForeignKey(
        'distribution.SupplyAgreement', on_delete=models.PROTECT,
        related_name='batches', null=True, blank=True
    )

    # Origin
    cooperative    = models.ForeignKey('cooperatives.Cooperative', on_delete=models.PROTECT, related_name='batches')
    crop           = models.ForeignKey('cooperatives.Crop', on_delete=models.PROTECT, related_name='batches')
    stock_record   = models.ForeignKey('cooperatives.CooperativeStock', on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='batches')
    dispatched_by  = models.ForeignKey('authentication.User', on_delete=models.PROTECT, related_name='dispatched_batches')

    # Dispatch record (Handover Point 1)
    dispatch_weight_kg        = models.DecimalField(max_digits=10, decimal_places=2)
    quality_grade_at_dispatch = models.CharField(max_length=1, choices=QualityGrade.choices)
    dispatch_timestamp        = models.DateTimeField()
    dispatch_gps_lat          = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    dispatch_gps_lng          = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Transport
    transport_request_leg1 = models.ForeignKey('transport.TransportRequest', on_delete=models.SET_NULL,
                                                null=True, blank=True, related_name='batch_leg1')
    transport_request_leg2 = models.ForeignKey('transport.TransportRequest', on_delete=models.SET_NULL,
                                                null=True, blank=True, related_name='batch_leg2')

    # Distributor receipt (Handover Point 2)
    received_by_distributor  = models.ForeignKey('distribution.Distributor', on_delete=models.SET_NULL,
                                                  null=True, blank=True, related_name='received_batches')
    weight_at_distributor_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quality_at_distributor   = models.CharField(max_length=1, choices=QualityGrade.choices, blank=True)
    distributor_receipt_timestamp = models.DateTimeField(null=True, blank=True)

    # Order (links to market agent)
    order = models.ForeignKey('distribution.Order', on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='batch')

    # Status
    current_status = models.CharField(max_length=20, choices=Status.choices, default=Status.AT_COOPERATIVE)

    # Computed loss totals (updated by signal/task when each handover point is recorded)
    transit_loss_leg1_kg    = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    transit_loss_leg1_pct   = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    self_transport_loss_kg  = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    self_transport_loss_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    market_spoilage_loss_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    market_spoilage_loss_pct= models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_loss_kg           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_loss_pct          = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-dispatch_timestamp']
        indexes = [
            models.Index(fields=['batch_id']),
            models.Index(fields=['current_status']),
            models.Index(fields=['cooperative', 'dispatch_timestamp']),
            models.Index(fields=['received_by_distributor', 'distributor_receipt_timestamp']),
        ]

    def __str__(self):
        return f"Batch {str(self.batch_id)[:8]}... — {self.crop.name} {self.dispatch_weight_kg}kg"

    def calculate_transit_loss_leg1(self):
        if self.dispatch_weight_kg and self.weight_at_distributor_kg:
            loss_kg = max(0, float(self.dispatch_weight_kg) - float(self.weight_at_distributor_kg))
            loss_pct = (loss_kg / float(self.dispatch_weight_kg) * 100) if float(self.dispatch_weight_kg) > 0 else 0
            self.transit_loss_leg1_kg = round(loss_kg, 2)
            self.transit_loss_leg1_pct = round(loss_pct, 2)
        return self.transit_loss_leg1_kg

    def calculate_total_loss(self):
        total_kg = sum([
            float(self.transit_loss_leg1_kg or 0),
            float(self.self_transport_loss_kg or 0),
            float(self.market_spoilage_loss_kg or 0),
        ])
        self.total_loss_kg = round(total_kg, 2)
        if float(self.dispatch_weight_kg) > 0:
            self.total_loss_pct = round((total_kg / float(self.dispatch_weight_kg)) * 100, 2)
        return self.total_loss_kg


class QRCodeScanEvent(models.Model):
    """
    Records each QR code scan event at a handover point.
    These are tamper-evident handover anchors — immutable once created.
    """

    class ScanPoint(models.TextChoices):
        PICKUP_CONFIRMATION  = 'PICKUP_CONFIRMATION',  'Transporter Pickup Confirmed'
        DISTRIBUTOR_RECEIPT  = 'DISTRIBUTOR_RECEIPT',  'Distributor Receipt Confirmed'
        AGENT_COLLECTION     = 'AGENT_COLLECTION',     'Market Agent Collection Confirmed'

    batch      = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name='qr_scans')
    scan_point = models.CharField(max_length=30, choices=ScanPoint.choices)
    scanned_by = models.ForeignKey('authentication.User', on_delete=models.PROTECT, related_name='qr_scans')
    gps_latitude  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scanned_at']
        # Prevent deletion of scan records
        default_permissions = ('add', 'view')

    def __str__(self):
        return f"QR Scan — {self.scan_point} — Batch {str(self.batch.batch_id)[:8]}"
