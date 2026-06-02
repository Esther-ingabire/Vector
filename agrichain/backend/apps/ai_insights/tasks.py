"""AI Insights Engine — nightly generation of intelligence brief."""
from celery import shared_task


@shared_task
def generate_daily_insights():
    """
    Generates the daily AI intelligence brief for MINAGRI Officer dashboard.
    Runs at 01:30 Kigali time after nightly data aggregation completes.
    """
    from apps.analytics.models import NationalDailyKPI, DistrictDailyKPI
    from apps.ai_insights.models import AIInsight, DailyBriefBundle
    from django.utils import timezone
    from django.db.models import Max
    import datetime

    today = timezone.now().date()
    yesterday = today - datetime.timedelta(days=1)
    week_ago = today - datetime.timedelta(days=7)

    insights_created = []

    # 1. National loss summary
    try:
        kpi_today = NationalDailyKPI.objects.get(date=yesterday)
        kpi_prev  = NationalDailyKPI.objects.filter(date=week_ago).first()
        change = ""
        if kpi_prev:
            diff = float(kpi_today.total_loss_pct) - float(kpi_prev.total_loss_pct)
            change = f" This is {'better' if diff < 0 else 'worse'} than last week by {abs(diff):.1f}%."

        insight = AIInsight.objects.create(
            insight_type=AIInsight.InsightType.NATIONAL_LOSS,
            title="National Post-Harvest Loss Summary",
            content=(
                f"Total post-harvest loss yesterday was {kpi_today.total_loss_kg:.1f} tons "
                f"across {kpi_today.total_batches} batches, representing "
                f"{kpi_today.total_loss_pct}% of dispatched volume.{change}"
            ),
            data_period_start=yesterday,
            data_period_end=yesterday,
        )
        insights_created.append(insight)
    except NationalDailyKPI.DoesNotExist:
        pass

    # 2. Highest-loss district alert
    worst_district = DistrictDailyKPI.objects.filter(date=yesterday).order_by("-loss_rate_pct").first()
    if worst_district and float(worst_district.loss_rate_pct) > 20:
        insight = AIInsight.objects.create(
            insight_type=AIInsight.InsightType.ROUTE_ALERT,
            title=f"High Loss Alert: {worst_district.district_name} District",
            content=(
                f"{worst_district.district_name} district recorded a {worst_district.loss_rate_pct}% "
                f"loss rate yesterday across {worst_district.batch_count} batches — "
                f"above the 20% alert threshold. Immediate investigation recommended."
            ),
            data_period_start=yesterday,
            data_period_end=yesterday,
            is_critical=float(worst_district.loss_rate_pct) > 30,
            related_district=worst_district.district_name,
        )
        insights_created.append(insight)

    # 3. Stage breakdown
    try:
        kpi = NationalDailyKPI.objects.get(date=yesterday)
        stages = {
            "Transit (Leg 1)": float(kpi.transit_leg1_loss_kg),
            "Self-transport": float(kpi.self_transport_loss_kg),
            "Market spoilage": float(kpi.market_spoilage_loss_kg),
            "Cold storage": float(kpi.storage_loss_kg),
        }
        top_stage = max(stages, key=stages.get)
        top_loss  = stages[top_stage]
        insight = AIInsight.objects.create(
            insight_type=AIInsight.InsightType.STAGE_BREAKDOWN,
            title="Loss Stage Breakdown",
            content=(
                f"The highest loss stage yesterday was {top_stage} at {top_loss:.1f} tons. "
                + " | ".join([f"{k}: {v:.1f}t" for k, v in stages.items()])
            ),
            data_period_start=yesterday,
            data_period_end=yesterday,
        )
        insights_created.append(insight)
    except NationalDailyKPI.DoesNotExist:
        pass

    # 4. Delivery method insight
    from apps.analytics.models import DeliveryMethodComparison
    recent_comparison = DeliveryMethodComparison.objects.filter(
        market_agent__isnull=False
    ).order_by("-week_starting").first()
    if recent_comparison:
        self_loss = float(recent_comparison.self_collection_avg_loss_pct)
        trans_loss = float(recent_comparison.transporter_avg_loss_pct)
        if self_loss > trans_loss and self_loss > 10:
            insight = AIInsight.objects.create(
                insight_type=AIInsight.InsightType.DELIVERY_INSIGHT,
                title="Delivery Method Performance Gap Detected",
                content=(
                    f"Market agents using self-collection are experiencing {self_loss:.1f}% average loss "
                    f"vs {trans_loss:.1f}% for transporter delivery this week — a gap of {self_loss-trans_loss:.1f}%. "
                    f"Switching high-loss agents to transporter delivery could save "
                    f"{recent_comparison.potential_saving_kg_per_week:.1f} kg per week."
                ),
                data_period_start=recent_comparison.week_starting,
                data_period_end=today,
            )
            insights_created.append(insight)

    # Bundle all insights into today\'s brief
    if insights_created:
        bundle = DailyBriefBundle.objects.create(
            brief_date=today,
            summary_text=f"Daily supply chain intelligence — {len(insights_created)} insights generated for {today}.",
        )
        bundle.insights.set(insights_created)
        return f"Daily brief generated with {len(insights_created)} insights."

    return "No insights generated (insufficient data)."
