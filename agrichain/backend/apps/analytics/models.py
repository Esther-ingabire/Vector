"""
Analytics models: Pre-computed KPI tables updated by nightly Celery jobs.
Reading from these tables is fast — no heavy aggregation queries at request time.
"""

from django.db import models


class NationalDailyKPI(models.Model):
    """Aggregated national supply chain KPIs per day. Computed by nightly Celery job."""

    date                        = models.DateField(unique=True)
    total_batches               = models.IntegerField(default=0)
    total_volume_dispatched_kg  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_volume_received_kg    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_loss_kg               = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_loss_pct              = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Loss by stage
    storage_loss_kg             = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transit_leg1_loss_kg        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    self_transport_loss_kg      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    market_spoilage_loss_kg     = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Operational metrics
    active_cooperatives         = models.IntegerField(default=0)
    active_transporters         = models.IntegerField(default=0)
    active_distributors         = models.IntegerField(default=0)
    active_market_agents        = models.IntegerField(default=0)
    on_time_delivery_rate_pct   = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        verbose_name = 'National Daily KPI'

    def __str__(self):
        return f"National KPI {self.date} — Loss: {self.total_loss_pct}%"


class DistrictDailyKPI(models.Model):
    """Aggregated KPIs per district per day."""

    date            = models.DateField()
    district_name   = models.CharField(max_length=100)
    volume_kg       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_loss_kg   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loss_rate_pct   = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    top_loss_stage  = models.CharField(max_length=20, blank=True)
    top_loss_crop   = models.CharField(max_length=100, blank=True)
    batch_count     = models.IntegerField(default=0)
    computed_at     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('date', 'district_name')
        ordering = ['-date', '-loss_rate_pct']
        verbose_name = 'District Daily KPI'

    def __str__(self):
        return f"{self.district_name} — {self.date} — {self.loss_rate_pct}%"


class CooperativeReliabilityHistory(models.Model):
    """Weekly reliability score snapshots for cooperative performance trend analysis."""

    cooperative           = models.ForeignKey('cooperatives.Cooperative', on_delete=models.CASCADE,
                                               related_name='reliability_history')
    week_starting         = models.DateField()
    reliability_score     = models.DecimalField(max_digits=3, decimal_places=2)
    on_time_dispatch_rate = models.DecimalField(max_digits=5, decimal_places=2)
    quality_consistency   = models.DecimalField(max_digits=5, decimal_places=2)
    response_rate         = models.DecimalField(max_digits=5, decimal_places=2)
    batches_this_week     = models.IntegerField(default=0)
    computed_at           = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cooperative', 'week_starting')
        ordering = ['-week_starting']

    def __str__(self):
        return f"{self.cooperative.name} — Week {self.week_starting} — {self.reliability_score}★"


class DeliveryMethodComparison(models.Model):
    """
    Pre-computed comparison of loss rates between self-collection and transporter delivery.
    Computed weekly per market agent and aggregated for distributor and national views.
    """

    week_starting              = models.DateField()
    market_agent               = models.ForeignKey('market_agents.MarketAgent', on_delete=models.CASCADE,
                                                    related_name='delivery_comparisons', null=True, blank=True)
    distributor                = models.ForeignKey('distribution.Distributor', on_delete=models.SET_NULL,
                                                   null=True, blank=True, related_name='delivery_comparisons')
    district                   = models.CharField(max_length=100, blank=True)

    # Self-collection stats
    self_collection_orders     = models.IntegerField(default=0)
    self_collection_avg_loss_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Transporter delivery stats
    transporter_orders         = models.IntegerField(default=0)
    transporter_avg_loss_pct   = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Potential loss saving if all orders switched to better method
    potential_saving_kg_per_week = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    recommended_method           = models.CharField(max_length=30, blank=True)

    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-week_starting']

    def __str__(self):
        return f"Delivery comparison — {self.market_agent or self.district} — {self.week_starting}"
