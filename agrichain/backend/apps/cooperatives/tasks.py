"""Celery tasks for cooperative analytics."""
from celery import shared_task


@shared_task
def recalculate_reliability_scores():
    """
    Recalculate reliability scores for all cooperatives.
    Formula: on_time_rate(40%) + quality_consistency_rate(40%) + response_rate(20%)
    Runs weekly every Monday at 05:00 Kigali time.
    """
    from apps.cooperatives.models import Cooperative
    from apps.traceability.models import Batch
    from apps.distribution.models import ProduceRequest
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=90)

    for cooperative in Cooperative.objects.filter(is_active=True):
        batches = Batch.objects.filter(cooperative=cooperative, dispatch_timestamp__gte=cutoff)
        total = batches.count()

        if total == 0:
            cooperative.reliability_score = 0
            cooperative.on_time_dispatch_rate = 0
            cooperative.quality_consistency_rate = 0
            cooperative.response_rate = 0
            cooperative.reliability_last_updated = timezone.now()
            cooperative.save(update_fields=["reliability_score","on_time_dispatch_rate",
                                             "quality_consistency_rate","response_rate","reliability_last_updated"])
            continue

        # On-time: delivered within agreed date
        on_time = batches.filter(
            transport_request_leg1__isnull=False,
            supply_agreement__isnull=False,
            distributor_receipt_timestamp__lte=models_F("supply_agreement__agreed_delivery_date")
        ).count()

        # Quality consistency: quality grade at receipt matches dispatch grade
        quality_match = batches.filter(
            quality_at_distributor=models_F("quality_grade_at_dispatch")
        ).exclude(quality_at_distributor="").count()
        quality_denominator = batches.exclude(quality_at_distributor="").count() or 1

        # Response rate: produce requests responded to within 48 hours
        requests = ProduceRequest.objects.filter(cooperative=cooperative, created_at__gte=cutoff)
        responded = requests.filter(
            status__in=[ProduceRequest.Status.ACCEPTED, ProduceRequest.Status.NEGOTIATING, ProduceRequest.Status.DECLINED]
        ).count()
        req_total = requests.count() or 1

        on_time_rate = (on_time / total) * 100
        quality_rate = (quality_match / quality_denominator) * 100
        resp_rate    = (responded / req_total) * 100

        raw_score = (on_time_rate * 0.4 + quality_rate * 0.4 + resp_rate * 0.2)
        star_score = round(raw_score / 20, 2)  # Convert 0-100 to 0-5

        cooperative.reliability_score = min(5.00, star_score)
        cooperative.on_time_dispatch_rate = round(on_time_rate, 2)
        cooperative.quality_consistency_rate = round(quality_rate, 2)
        cooperative.response_rate = round(resp_rate, 2)
        cooperative.total_batches_dispatched = total
        cooperative.reliability_last_updated = timezone.now()
        cooperative.save(update_fields=["reliability_score","on_time_dispatch_rate","quality_consistency_rate",
                                         "response_rate","total_batches_dispatched","reliability_last_updated"])

    return f"Reliability scores updated for {Cooperative.objects.filter(is_active=True).count()} cooperatives."
