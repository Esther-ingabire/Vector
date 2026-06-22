"""
Tests for the core batch traceability flow: dispatch, QR label generation,
distributor receipt confirmation (with automatic loss calculation), and the
distributor-visibility queryset that previously crashed on every request.
"""
import uuid
import pytest
from django.utils import timezone
from rest_framework import status


def _make_cooperative(make_user):
    from apps.cooperatives.models import Cooperative

    manager = make_user('COOPERATIVE_MANAGER', password='Pass1234!')
    coop = Cooperative.objects.create(
        manager=manager,
        name='Test Cooperative',
        registration_number=f'REG-{uuid.uuid4().hex[:8]}',
        district='Kigali',
    )
    return manager, coop


def _make_crop():
    from apps.cooperatives.models import Crop
    return Crop.objects.create(
        name=f'TestCrop-{uuid.uuid4().hex[:6]}', category='PERISHABLE',
        safe_transit_hours_amber=4.0, safe_transit_hours_red=8.0,
    )


def _make_distributor(make_user):
    from apps.distribution.models import Distributor

    user = make_user('DISTRIBUTOR', password='Pass1234!')
    distributor = Distributor.objects.create(
        user=user,
        company_name='Test Distributor Ltd',
        warehouse_location='Kigali Warehouse',
        district='Kigali',
        contact_phone=user.phone_number,
    )
    return user, distributor


def _make_supply_agreement(distributor, coop, crop):
    """
    A batch is only visible to / actionable by a distributor once it is linked through
    a SupplyAgreement (the real traceability anchor) — see
    BatchViewSet.get_queryset()'s DISTRIBUTOR branch.
    """
    from apps.distribution.models import ProduceRequest, SupplyAgreement

    request = ProduceRequest.objects.create(
        distributor=distributor, cooperative=coop, crop=crop,
        quantity_kg=500, quality_grade_required='A',
        required_delivery_date=timezone.now().date(),
        status=ProduceRequest.Status.ACCEPTED,
    )
    return SupplyAgreement.objects.create(
        produce_request=request, agreed_quantity_kg=500,
        agreed_quality_grade='A', agreed_delivery_date=timezone.now().date(),
    )


@pytest.mark.django_db
class TestBatchDispatch:

    def test_dispatch_creates_batch_owned_by_requesting_cooperative(self, api_client, make_user):
        from apps.traceability.models import Batch

        manager, coop = _make_cooperative(make_user)
        crop = _make_crop()
        api_client.force_authenticate(user=manager)

        res = api_client.post('/api/v1/traceability/batches/', {
            'crop': crop.id,
            'dispatch_weight_kg': 300,
            'quality_grade_at_dispatch': 'B',
            'dispatch_timestamp': timezone.now().isoformat(),
        }, format='json')

        assert res.status_code == status.HTTP_201_CREATED
        batch = Batch.objects.get(id=res.data['id'])
        assert batch.cooperative_id == coop.id
        assert batch.dispatched_by_id == manager.id
        # New batches default to AT_COOPERATIVE, not a generic "PENDING" status.
        assert batch.current_status == Batch.Status.AT_COOPERATIVE

    def test_qr_endpoint_returns_a_png_image(self, api_client, make_user):
        from apps.traceability.models import Batch

        manager, coop = _make_cooperative(make_user)
        crop = _make_crop()
        batch = Batch.objects.create(
            cooperative=coop, crop=crop, dispatched_by=manager,
            dispatch_weight_kg=500, quality_grade_at_dispatch='A',
            dispatch_timestamp=timezone.now(),
        )
        api_client.force_authenticate(user=manager)

        res = api_client.get(f'/api/v1/traceability/batches/{batch.id}/qr/')
        assert res.status_code == status.HTTP_200_OK
        assert res['Content-Type'] == 'image/png'


@pytest.mark.django_db
class TestReceiptConfirmation:

    def test_confirm_receipt_computes_loss_and_updates_status(self, api_client, make_user):
        from apps.traceability.models import Batch

        manager, coop = _make_cooperative(make_user)
        crop = _make_crop()
        dist_user, distributor = _make_distributor(make_user)
        agreement = _make_supply_agreement(distributor, coop, crop)

        batch = Batch.objects.create(
            cooperative=coop, crop=crop, dispatched_by=manager,
            supply_agreement=agreement,
            dispatch_weight_kg=500, quality_grade_at_dispatch='A',
            dispatch_timestamp=timezone.now(),
        )

        api_client.force_authenticate(user=dist_user)
        res = api_client.post(f'/api/v1/traceability/batches/{batch.id}/confirm-receipt/', {
            'received_qty_kg': 460,
            'quality_grade_received': 'A',
        })

        assert res.status_code == status.HTTP_200_OK
        batch.refresh_from_db()
        assert batch.current_status == Batch.Status.AT_DISTRIBUTOR
        assert batch.received_by_distributor_id == distributor.id
        assert float(batch.transit_loss_leg1_kg) == 40.0
        assert float(batch.transit_loss_leg1_pct) == 8.0
        assert float(batch.total_loss_pct) == 8.0

    def test_confirm_receipt_with_no_shortfall_records_zero_loss(self, api_client, make_user):
        from apps.traceability.models import Batch

        manager, coop = _make_cooperative(make_user)
        crop = _make_crop()
        dist_user, distributor = _make_distributor(make_user)
        agreement = _make_supply_agreement(distributor, coop, crop)

        batch = Batch.objects.create(
            cooperative=coop, crop=crop, dispatched_by=manager,
            supply_agreement=agreement,
            dispatch_weight_kg=500, quality_grade_at_dispatch='A',
            dispatch_timestamp=timezone.now(),
        )

        api_client.force_authenticate(user=dist_user)
        res = api_client.post(f'/api/v1/traceability/batches/{batch.id}/confirm-receipt/', {
            'received_qty_kg': 500,
            'quality_grade_received': 'A',
        })

        assert res.status_code == status.HTTP_200_OK
        batch.refresh_from_db()
        assert float(batch.transit_loss_leg1_kg) == 0.0


@pytest.mark.django_db
class TestDistributorBatchVisibility:

    def test_distributor_sees_their_received_batches_without_error(self, api_client, make_user):
        """
        Regression test. BatchViewSet.get_queryset() for the DISTRIBUTOR role used to
        combine a plain queryset with a `.distinct()` queryset using `|`, which Django
        rejects with "Cannot combine a unique query with a non-unique query" — the bare
        `except Exception: return Batch.objects.none()` silently swallowed this, so
        every distributor saw an empty list. The fix combines both conditions into a
        single Q() filter with one `.distinct()` call.
        """
        from apps.traceability.models import Batch

        manager, coop = _make_cooperative(make_user)
        crop = _make_crop()
        dist_user, distributor = _make_distributor(make_user)

        Batch.objects.create(
            cooperative=coop, crop=crop, dispatched_by=manager,
            dispatch_weight_kg=500, quality_grade_at_dispatch='A',
            dispatch_timestamp=timezone.now(),
            received_by_distributor=distributor, weight_at_distributor_kg=480,
            current_status=Batch.Status.AT_DISTRIBUTOR,
        )

        api_client.force_authenticate(user=dist_user)
        res = api_client.get('/api/v1/traceability/batches/')

        assert res.status_code == status.HTTP_200_OK
        results = res.data.get('results', res.data)
        assert len(results) == 1

    def test_distributor_with_no_batches_sees_empty_list_not_an_error(self, api_client, make_user):
        dist_user, _distributor = _make_distributor(make_user)
        api_client.force_authenticate(user=dist_user)

        res = api_client.get('/api/v1/traceability/batches/')

        assert res.status_code == status.HTTP_200_OK
        results = res.data.get('results', res.data)
        assert results == []
