"""Celery tasks for analytics aggregation."""
from celery import shared_task


@shared_task
def run_nightly_aggregation():
    """Compute national and district KPIs for yesterday. Runs nightly at 01:00."""
    from apps.analytics.models import NationalDailyKPI, DistrictDailyKPI
    from apps.traceability.models import Batch
    from django.utils import timezone
    from django.db.models import Sum, Count, Avg
    import datetime

    yesterday = (timezone.now() - datetime.timedelta(days=1)).date()

    batches = Batch.objects.filter(dispatch_timestamp__date=yesterday)

    agg = batches.aggregate(
        total_batches=Count("id"),
        total_volume=Sum("dispatch_weight_kg"),
        total_received=Sum("weight_at_distributor_kg"),
        total_transit_loss=Sum("transit_loss_leg1_kg"),
        total_self_transport=Sum("self_transport_loss_kg"),
        total_market=Sum("market_spoilage_loss_kg"),
        total_loss=Sum("total_loss_kg"),
    )

    total_vol = float(agg["total_volume"] or 0)
    total_loss = float(agg["total_loss"] or 0)
    loss_pct = round((total_loss / total_vol * 100), 2) if total_vol > 0 else 0

    NationalDailyKPI.objects.update_or_create(
        date=yesterday,
        defaults={
            "total_batches": agg["total_batches"] or 0,
            "total_volume_dispatched_kg": total_vol,
            "total_volume_received_kg": float(agg["total_received"] or 0),
            "transit_leg1_loss_kg": float(agg["total_transit_loss"] or 0),
            "self_transport_loss_kg": float(agg["total_self_transport"] or 0),
            "market_spoilage_loss_kg": float(agg["total_market"] or 0),
            "total_loss_kg": total_loss,
            "total_loss_pct": loss_pct,
        }
    )

    # District breakdown
    from django.db.models import F
    districts = batches.values("cooperative__district").annotate(
        vol=Sum("dispatch_weight_kg"),
        loss=Sum("total_loss_kg"),
        count=Count("id")
    )
    for d in districts:
        district_name = d["cooperative__district"] or "Unknown"
        vol = float(d["vol"] or 0)
        loss = float(d["loss"] or 0)
        rate = round((loss / vol * 100), 2) if vol > 0 else 0
        DistrictDailyKPI.objects.update_or_create(
            date=yesterday, district_name=district_name,
            defaults={"volume_kg": vol, "total_loss_kg": loss, "loss_rate_pct": rate, "batch_count": d["count"]}
        )

    return f"KPIs computed for {yesterday}: {agg['total_batches']} batches, {loss_pct}% loss"


@shared_task
def refresh_weekly_kpis():
    """Placeholder for weekly KPI refresh."""
    return "Weekly KPIs refreshed."


@shared_task
def compute_monthly_trends():
    """Placeholder for monthly trend computation."""
    return "Monthly trends computed."
