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


class ColdStorageFacility(models.Model):
    """
    Cold storage facility at a cooperative. IoT sensor data is linked here.
    """

    cooperative          = models.ForeignKey(Cooperative, on_delete=models.CASCADE, related_name='storage_facilities')
    name                 = models.CharField(max_length=200)
    capacity_kg          = models.DecimalField(max_digits=10, decimal_places=2)
    location_description = models.TextField(blank=True)
    has_iot_sensor       = models.BooleanField(default=False)
    sensor_device_id     = models.CharField(max_length=100, blank=True, help_text="ESP32 device identifier")

    # Alert thresholds (configurable per facility)
    temp_threshold_amber_celsius = models.FloatField(default=15.0)
    temp_threshold_red_celsius   = models.FloatField(default=20.0)
    humidity_threshold_percent   = models.FloatField(default=85.0)

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Cold Storage Facilities'
        ordering = ['cooperative', 'name']

    def __str__(self):
        return f"{self.name} @ {self.cooperative.name}"
