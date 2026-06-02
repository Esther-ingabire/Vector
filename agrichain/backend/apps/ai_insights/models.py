"""
AI Insights Engine models.
Stores auto-generated daily intelligence briefs and recommendations.
"""

from django.db import models


class AIInsight(models.Model):
    """
    Auto-generated analytical insight produced nightly by the AI Insights Engine.
    Displayed on the MINAGRI Officer dashboard as the 'Daily Intelligence Brief'.
    """

    class InsightType(models.TextChoices):
        DAILY_BRIEF         = 'DAILY_BRIEF',         'Daily Intelligence Brief'
        NATIONAL_LOSS       = 'NATIONAL_LOSS',       'National Loss Summary'
        STAGE_BREAKDOWN     = 'STAGE_BREAKDOWN',     'Stage-by-Stage Breakdown'
        ROUTE_ALERT         = 'ROUTE_ALERT',         'Route Loss Alert'
        COLD_CHAIN_ALERT    = 'COLD_CHAIN_ALERT',    'Cold Chain Alert'
        DELIVERY_INSIGHT    = 'DELIVERY_INSIGHT',    'Delivery Method Insight'
        COOP_PERFORMANCE    = 'COOP_PERFORMANCE',    'Cooperative Performance'
        AGENT_ALERT         = 'AGENT_ALERT',         'Market Agent High-Loss Alert'
        SEASONAL_OUTLOOK    = 'SEASONAL_OUTLOOK',    'Seasonal Outlook'
        RECOMMENDATION      = 'RECOMMENDATION',      'Actionable Recommendation'

    insight_type       = models.CharField(max_length=30, choices=InsightType.choices)
    title              = models.CharField(max_length=300)
    content            = models.TextField()
    data_period_start  = models.DateField()
    data_period_end    = models.DateField()

    # Critical insights trigger push notifications
    is_critical        = models.BooleanField(default=False)
    alert_triggered    = models.BooleanField(default=False)

    # The district or entity this insight is about (optional — national insights have no entity)
    related_district   = models.CharField(max_length=100, blank=True)
    related_cooperative = models.ForeignKey('cooperatives.Cooperative', on_delete=models.SET_NULL,
                                             null=True, blank=True, related_name='ai_insights')
    related_market_agent = models.ForeignKey('market_agents.MarketAgent', on_delete=models.SET_NULL,
                                              null=True, blank=True, related_name='ai_insights')

    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-generated_at']
        indexes = [models.Index(fields=['insight_type', 'generated_at'])]

    def __str__(self):
        return f"{self.insight_type} — {self.data_period_end} — {self.title[:60]}"


class DailyBriefBundle(models.Model):
    """
    Groups all AI insights generated on a given date into a single 'brief'.
    The MINAGRI dashboard shows the most recent DailyBriefBundle.
    """

    brief_date   = models.DateField(unique=True)
    insights     = models.ManyToManyField(AIInsight, related_name='bundles')
    summary_text = models.TextField(help_text="Headline summary shown at top of brief")
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-brief_date']

    def __str__(self):
        return f"Daily Brief — {self.brief_date}"
