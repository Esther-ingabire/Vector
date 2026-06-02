"""Celery tasks for batch loss prediction scoring."""
from celery import shared_task


@shared_task
def score_batch_on_dispatch(batch_id):
    """Score a batch for transit risk when it leaves the cooperative."""
    from apps.traceability.models import Batch
    from apps.predictions.models import LossPrediction
    from apps.predictions.engine import PredictionInput, predict_transit_loss

    try:
        batch = Batch.objects.select_related("crop").get(id=batch_id)
    except Batch.DoesNotExist:
        return

    inp = PredictionInput(crop_name=batch.crop.name)
    result = predict_transit_loss(inp)

    LossPrediction.objects.create(
        batch=batch,
        prediction_stage=LossPrediction.PredictionStage.TRANSIT_LEG1,
        risk_score=result.risk_score,
        risk_label=result.risk_label,
        confidence_pct=result.confidence_pct,
        contributing_factors=result.contributing_factors,
        recommendation=result.recommendation,
        phase=LossPrediction.Phase.RULE_BASED,
    )


@shared_task
def score_order_self_transport_risk(order_id):
    """Score self-transport risk for a market agent self-collection order."""
    from apps.distribution.models import Order
    from apps.predictions.models import LossPrediction
    from apps.predictions.engine import PredictionInput, predict_self_transport_risk
    from django.utils import timezone

    try:
        order = Order.objects.select_related(
            "collection_notice__crop", "market_agent"
        ).get(id=order_id, delivery_method=Order.DeliveryMethod.SELF_COLLECTION)
    except Order.DoesNotExist:
        return

    current_hour = timezone.now().hour
    inp = PredictionInput(
        crop_name=order.collection_notice.crop.name,
        time_of_day_hour=current_hour,
    )
    result = predict_self_transport_risk(inp)

    LossPrediction.objects.create(
        order=order,
        prediction_stage=LossPrediction.PredictionStage.SELF_TRANSPORT,
        risk_score=result.risk_score,
        risk_label=result.risk_label,
        confidence_pct=result.confidence_pct,
        contributing_factors=result.contributing_factors,
        recommendation=result.recommendation,
        phase=LossPrediction.Phase.RULE_BASED,
    )
