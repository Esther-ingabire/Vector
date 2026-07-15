"""
Cooperative models: Cooperative profiles, crops, stock, cold storage facilities.
"""

from django.db import models
from django.conf import settings


class Crop(models.Model):
    """
    Crop type with loss threshold configuration.
    Pre-seeded with Rwanda's major crops using FAO/RAB benchmarks.
    """

    class CropCategory(models.TextChoices):
        PERISHABLE  = 'PERISHABLE',  'Perishable'
        DRY_GOODS   = 'DRY_GOODS',   'Dry Goods'
        ROOT_TUBERS = 'ROOT_TUBERS', 'Root & Tubers'
        FRUITS      = 'FRUITS',      'Fruits'

    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CropCategory.choices)
    requires_cold_chain = models.BooleanField(default=False)

    # Loss prediction thresholds (Phase 1 rule-based)
    safe_transit_hours_amber = models.FloatField(help_text="Transit hours before Amber risk")
    safe_transit_hours_red   = models.FloatField(help_text="Transit hours before Red risk")
    safe_temp_max_amber      = models.FloatField(null=True, blank=True, help_text="Max temp (°C) before Amber")
    safe_temp_max_red        = models.FloatField(null=True, blank=True, help_text="Max temp (°C) before Red")
    safe_storage_days_amber  = models.IntegerField(default=30, help_text="Storage days before Amber risk")
    safe_storage_days_red    = models.IntegerField(default=60, help_text="Storage days before Red risk")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Cooperative(models.Model):
    """
    Registered farmers' cooperative. Each cooperative has one manager (User with COOPERATIVE_MANAGER role).
    The cooperative profile is publicly searchable by distributors.
    """

    manager = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='cooperative', limit_choices_to={'role': 'COOPERATIVE_MANAGER'}
    )
    name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=100, unique=True)
    district = models.CharField(max_length=100)
    sector = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    # GPS coordinates for map display
    gps_latitude  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    crops_specialised = models.ManyToManyField(Crop, blank=True, related_name='cooperatives')

    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField(blank=True)

    # Computed weekly by Celery task (apps.cooperatives.tasks.recalculate_reliability_scores)
    # Formula: on_time_rate(40%) + quality_consistency_rate(40%) + response_rate(20%)
    reliability_score = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00,
        help_text="0.00–5.00 star rating. Auto-calculated weekly."
    )
    on_time_dispatch_rate    = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    quality_consistency_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    response_rate            = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    total_batches_dispatched = models.PositiveIntegerField(default=0)
    reliability_last_updated = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.district})"


class CooperativeStock(models.Model):
    """
    Current available stock per crop at a cooperative.
    Updated by cooperative manager when new harvest arrives or stock is dispatched.
    These records feed the cooperative directory search results.
    """

    class QualityGrade(models.TextChoices):
        GRADE_A = 'A', 'Grade A — Premium'
        GRADE_B = 'B', 'Grade B — Standard'
        GRADE_C = 'C', 'Grade C — Below Standard'

    cooperative  = models.ForeignKey(Cooperative, on_delete=models.CASCADE, related_name='stock_records')
    crop         = models.ForeignKey(Crop, on_delete=models.PROTECT, related_name='stock_records')
    quantity_kg  = models.DecimalField(max_digits=10, decimal_places=2)
    quality_grade = models.CharField(max_length=1, choices=QualityGrade.choices)
    harvest_date  = models.DateField()
    available_from = models.DateField()
    notes         = models.TextField(blank=True)

    is_available = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.cooperative.name} — {self.crop.name} {self.quantity_kg}kg ({self.quality_grade})"


class CooperativeWasteReport(models.Model):
    """
    End-of-period loss report submitted by a cooperative for produce that spoiled or was
    discarded before it was ever dispatched — the very first stage of the chain, one step
    earlier than DistributorWasteReport (cooperative → distributor → market). Without this,
    the system tracked loss at every stage AFTER dispatch but had a blind spot for produce
    that never left the cooperative at all.
    """

    class DiscardReason(models.TextChoices):
        SPOILAGE  = 'SPOILAGE',  'Spoilage — natural deterioration'
        NO_DEMAND = 'NO_DEMAND', 'No demand — not requested by distributors before spoilage'
        DAMAGE    = 'DAMAGE',    'Physical/handling damage in storage'
        OTHER     = 'OTHER',     'Other — see notes'

    cooperative             = models.ForeignKey(Cooperative, on_delete=models.PROTECT, related_name='waste_reports')
    # Nullable so a report can, in principle, still be filed without pinning to one crop —
    # but the multi-crop-row submission form always sets it for every row it creates.
    crop                    = models.ForeignKey(Crop, on_delete=models.PROTECT, null=True, blank=True,
                                                 related_name='cooperative_waste_reports')
    reporting_period_start  = models.DateField()
    reporting_period_end    = models.DateField()

    quantity_dispatched_kg  = models.DecimalField(max_digits=10, decimal_places=2,
                                                   help_text="Quantity dispatched to distributors during this period")
    quantity_discarded_kg   = models.DecimalField(max_digits=10, decimal_places=2)
    discard_reason          = models.CharField(max_length=20, choices=DiscardReason.choices)
    discard_notes           = models.TextField(blank=True)

    # Pre-dispatch loss — calculated by the system: discarded / (dispatched + discarded)
    storage_spoilage_loss_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def save(self, *args, **kwargs):
        total = float(self.quantity_dispatched_kg) + float(self.quantity_discarded_kg)
        self.storage_spoilage_loss_pct = round(float(self.quantity_discarded_kg) / total * 100, 2) if total > 0 else 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Waste report: {self.cooperative} ({self.reporting_period_start} to {self.reporting_period_end})"


class WarehouseManager(models.Model):
    """
    Independent operator of cold storage facilities that cooperatives without their own
    storage can rent space in. A WarehouseManager owns/manages ColdStorageFacility records
    directly (see ColdStorageFacility.warehouse_manager).
    """

    user         = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                        related_name='warehouse_manager_profile',
                                        limit_choices_to={'role': 'WAREHOUSE_MANAGER'})
    company_name = models.CharField(max_length=200, blank=True)
    district     = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.company_name or self.user.get_full_name()


class ColdStorageFacility(models.Model):
    """
    Cold storage facility. Either owned/operated directly by a cooperative (the original
    design — `cooperative` set, `warehouse_manager` null), or owned by an independent
    WarehouseManager and rented out to cooperatives that lack their own storage.

    For a warehouse-manager-owned facility, `cooperative` is null until a rental request is
    accepted — at which point it's set to the renting cooperative. This means every existing
    code path that scopes IoT readings/analytics through `facility.cooperative` keeps working
    unchanged regardless of who owns the physical hardware.
    """

    cooperative          = models.ForeignKey(Cooperative, on_delete=models.CASCADE,
                                             related_name='storage_facilities', null=True, blank=True)
    warehouse_manager    = models.ForeignKey(WarehouseManager, on_delete=models.SET_NULL,
                                             related_name='facilities', null=True, blank=True)
    name                 = models.CharField(max_length=200)
    capacity_kg          = models.DecimalField(max_digits=10, decimal_places=2)
    location_description = models.TextField(blank=True)
    gps_latitude         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_longitude        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    has_iot_sensor       = models.BooleanField(default=False)
    sensor_device_id     = models.CharField(max_length=100, blank=True, help_text="ESP32 device identifier")

    # Rental — only meaningful when warehouse_manager is set
    is_available_for_rent  = models.BooleanField(default=False)
    rental_price_per_month = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                                 help_text="RWF per month, shown to cooperatives browsing for space.")

    # Alert thresholds (configurable per facility)
    temp_threshold_amber_celsius = models.FloatField(default=15.0)
    temp_threshold_red_celsius   = models.FloatField(default=20.0)
    humidity_threshold_percent   = models.FloatField(default=85.0)

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Cold Storage Facilities'
        ordering = ['name']

    def __str__(self):
        owner = self.cooperative.name if self.cooperative else (self.warehouse_manager or 'Unassigned')
        return f"{self.name} @ {owner}"


class WarehouseRentalRequest(models.Model):
    """
    A cooperative's request to rent space in a warehouse-manager-owned ColdStorageFacility.
    On acceptance, the facility's `cooperative` is set to the renter so every existing
    IoT/analytics code path scopes correctly without any further changes.
    """

    class Status(models.TextChoices):
        PENDING  = 'PENDING',  'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'
        ENDED    = 'ENDED',    'Ended'

    cooperative           = models.ForeignKey(Cooperative, on_delete=models.CASCADE, related_name='warehouse_rental_requests')
    facility              = models.ForeignKey(ColdStorageFacility, on_delete=models.CASCADE, related_name='rental_requests')
    requested_capacity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    requires_iot_monitoring = models.BooleanField(
        default=False,
        help_text="Cooperative needs the rented space to have IoT temperature/humidity monitoring.",
    )
    notes                 = models.TextField(blank=True)

    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    decline_reason = models.TextField(blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Rental request: {self.cooperative} → {self.facility} ({self.status})"


class WarehouseManagerRating(models.Model):
    """
    A cooperative's 1-5 star rating + comment for a Warehouse Manager, left once a rental
    ends. Mirrors transport.TransporterRating — one rating per WarehouseRentalRequest via the
    OneToOneField below, not a Meta uniqueness constraint. Feeds the "suggested" ranking on
    the Rent Warehouse browse page.
    """

    rental_request        = models.OneToOneField(WarehouseRentalRequest, on_delete=models.CASCADE, related_name='rating')
    warehouse_manager     = models.ForeignKey(WarehouseManager, on_delete=models.CASCADE, related_name='ratings')
    rated_by_cooperative   = models.ForeignKey(Cooperative, null=True, blank=True, on_delete=models.SET_NULL)
    rating     = models.PositiveSmallIntegerField(help_text="1-5 stars")
    comment    = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}★ for {self.warehouse_manager} (Rental #{self.rental_request_id})"
