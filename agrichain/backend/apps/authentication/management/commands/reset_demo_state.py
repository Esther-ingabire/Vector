"""
python manage.py reset_demo_state

Resets THE ENTIRE SYSTEM back to a clean, presentation-ready state.
Run this before every demo or presentation session.

What it resets:
  TRANSPORT
  - All demo transport company requests → back to PENDING (ready to dispatch)
  - All active/accepted trips for demo drivers → cancelled, requests restored to PENDING
  - 3 fresh PENDING requests created for individual drivers (Patrick, Diane, Claudine)
  - Eric's active trip restored (RAB 456E stays busy for the is_busy demo)

  WAREHOUSE
  - All accepted/declined warehouse rental requests → back to PENDING
  - 4 fresh PENDING rental requests created if needed
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
import datetime


class Command(BaseCommand):
    help = 'Reset demo transport requests back to PENDING so the presentation flow works again'

    def handle(self, *args, **options):
        from apps.transport.models import Transporter, TransportRequest, Trip, Vehicle
        from apps.cooperatives.models import Cooperative

        self.stdout.write('Resetting demo state...\n')

        # ── 1. Find the two demo transport companies ───────────────────────
        try:
            kalinda = Transporter.objects.get(user__email='a.kalinda@chainsight.demo')
            gasana  = Transporter.objects.get(user__email='e.gasana@chainsight.demo')
        except Transporter.DoesNotExist:
            self.stderr.write('Demo company accounts not found — run seed_demo_data first.')
            return

        company_ids = [kalinda.id, gasana.id]
        driver_ids  = list(
            Transporter.objects.filter(parent_company__in=company_ids).values_list('id', flat=True)
        )
        all_transporter_ids = company_ids + driver_ids

        # ── 2. Reset all ACCEPTED/IN_PROGRESS requests back to PENDING ─────
        # Collect requests that need resetting (ACCEPTED or IN_PROGRESS for demo accounts)
        active_reqs = TransportRequest.objects.filter(
            transporter_id__in=all_transporter_ids,
            status__in=['ACCEPTED', 'IN_PROGRESS'],
        ).select_related('transporter')

        # Delete their trips first (FK is PROTECTED so must go before the request reset)
        trip_ids = list(Trip.objects.filter(
            transport_request__in=active_reqs
        ).values_list('id', flat=True))
        Trip.objects.filter(id__in=trip_ids).delete()
        cancelled = len(trip_ids)

        # Now reset each request back to PENDING on the company (not the driver)
        for req in active_reqs:
            trans = req.transporter
            req.transporter = trans.parent_company if trans.parent_company_id else trans
            req.status = 'PENDING'
            req.vehicle = None
            req.accepted_at = None
            req.save(update_fields=['transporter', 'status', 'vehicle', 'accepted_at'])

        self.stdout.write(f'  Reset {active_reqs.count()} request(s) to PENDING, deleted {cancelled} trip(s).')

        # ── 4. Recreate fresh PENDING requests for both companies ──────────
        coop = Cooperative.objects.filter(name__icontains='Musanze').first()
        if not coop:
            coop = Cooperative.objects.first()

        now = timezone.now()

        demo_requests = [
            # Kalinda Transport Co.
            dict(transporter=kalinda, requested_by_cooperative=coop, leg_number=1,
                 pickup_location='Musanze Collection Point',
                 pickup_gps_lat=-1.499, pickup_gps_lng=29.635,
                 destination='Kigali Nyabugogo Market',
                 destination_gps_lat=-1.938, destination_gps_lng=30.055,
                 cargo_description='Tomatoes — Grade A', estimated_cargo_weight_kg=1200,
                 requires_refrigeration=True,
                 required_pickup_datetime=now + datetime.timedelta(hours=6),
                 status='PENDING'),
            dict(transporter=kalinda, requested_by_cooperative=coop, leg_number=1,
                 pickup_location='Musanze Coop Warehouse',
                 pickup_gps_lat=-1.501, pickup_gps_lng=29.637,
                 destination='Rubavu Gisenyi Market',
                 destination_gps_lat=-1.683, destination_gps_lng=29.341,
                 cargo_description='Potatoes — 1.5 tonnes', estimated_cargo_weight_kg=1500,
                 requires_refrigeration=False,
                 required_pickup_datetime=now + datetime.timedelta(hours=12),
                 status='PENDING'),
            # Gasana Logistics Ltd
            dict(transporter=gasana, requested_by_cooperative=coop, leg_number=1,
                 pickup_location='Musanze Farmers Hub',
                 pickup_gps_lat=-1.497, pickup_gps_lng=29.634,
                 destination='Kigali Kimironko Market',
                 destination_gps_lat=-1.941, destination_gps_lng=30.072,
                 cargo_description='Maize — Bulk', estimated_cargo_weight_kg=2000,
                 requires_refrigeration=False,
                 required_pickup_datetime=now + datetime.timedelta(hours=24),
                 status='PENDING'),
        ]

        # Only create if none already exist
        existing_pending = TransportRequest.objects.filter(
            transporter_id__in=company_ids, status='PENDING'
        ).count()
        if existing_pending == 0:
            for data in demo_requests:
                TransportRequest.objects.create(**data)
            self.stdout.write(f'  Created {len(demo_requests)} fresh PENDING transport requests.')
        else:
            self.stdout.write(f'  {existing_pending} PENDING request(s) already exist — skipped recreation.')

        # ── 5. Recreate 3 pending requests for individual drivers ─────────
        try:
            patrick  = Transporter.objects.get(user__username='driver.mugenzi')
            diane    = Transporter.objects.get(user__username='driver.uwase')
            claudine = Transporter.objects.get(user__username='driver.mutesi')
            # Clear stale pending for these drivers then recreate fresh ones
            TransportRequest.objects.filter(
                transporter__in=[patrick, diane, claudine], status='PENDING'
            ).delete()
            driver_requests = [
                (patrick,  'Kinigi Sector',        -1.474, 29.573, 'Kigali Nyabugogo Market', -1.938, 30.055, 'Tomatoes — cold chain', 850,  True),
                (diane,    'Musanze Town Centre',   -1.499, 29.635, 'Huye Open Market',        -2.597, 29.737, 'Potatoes — bulk',       1400, False),
                (claudine, 'Gakenke District Hub',  -1.690, 29.790, 'Kigali Kimironko Market', -1.941, 30.072, 'Avocados — Grade A',    600,  False),
            ]
            for driver, pick, p_lat, p_lng, dest, d_lat, d_lng, cargo, kg, refrig in driver_requests:
                TransportRequest.objects.create(
                    transporter=driver, requested_by_cooperative=coop, leg_number=1,
                    pickup_location=pick, pickup_gps_lat=p_lat, pickup_gps_lng=p_lng,
                    destination=dest, destination_gps_lat=d_lat, destination_gps_lng=d_lng,
                    cargo_description=cargo, estimated_cargo_weight_kg=kg,
                    requires_refrigeration=refrig,
                    required_pickup_datetime=now + datetime.timedelta(hours=8),
                    status='PENDING',
                )
            self.stdout.write(f'  Created 3 PENDING requests for Patrick, Diane, and Claudine.')
        except Transporter.DoesNotExist:
            pass

        # ── 6. Restore Eric's active trip (so is_busy demo still works) ───
        try:
            eric = Transporter.objects.get(user__username='driver.nkurunziza')
            v_busy = Vehicle.objects.filter(transporter=eric, plate_number='RAB 456E').first()
            if v_busy and not Trip.objects.filter(
                transport_request__transporter=eric,
                pickup_confirmed_at__isnull=False,
                delivery_confirmed_at__isnull=True,
            ).exists():
                req = TransportRequest.objects.create(
                    transporter=eric, requested_by_cooperative=coop, leg_number=1,
                    pickup_location='Musanze Central', pickup_gps_lat=-1.499, pickup_gps_lng=29.635,
                    destination='Kigali CBD', destination_gps_lat=-1.944, destination_gps_lng=30.060,
                    cargo_description='Avocados — cold chain', estimated_cargo_weight_kg=800,
                    requires_refrigeration=True,
                    required_pickup_datetime=now - datetime.timedelta(hours=2),
                    status='ACCEPTED', vehicle=v_busy,
                )
                Trip.objects.create(
                    transport_request=req,
                    pickup_confirmed_at=now - datetime.timedelta(hours=1),
                )
                self.stdout.write('  Restored Eric Nkurunziza\'s active trip (RAB 456E busy demo).')
        except Transporter.DoesNotExist:
            pass

        # ── 7. Ensure produce request filter demo data exists ─────────────
        from apps.distribution.models import ProduceRequest, Distributor
        from apps.cooperatives.models import Cooperative as Coop2
        # Use actual demo distributor accounts, not just first()
        demo_dists = list(Distributor.objects.filter(
            user__email__in=['s.nkurunziza@chainsight.demo', 'e.ingabire@chainsight.demo']
        ))
        dist = demo_dists[0] if demo_dists else Distributor.objects.first()
        if dist:
            demo_coops = list(Coop2.objects.exclude(name__icontains='AUCA').order_by('id')[:3])
            from apps.cooperatives.models import Crop as CropM
            # Only recreate if no DECLINED/COMPLETED/NEGOTIATING/CANCELLED exist
            if not ProduceRequest.objects.filter(
                distributor=dist, status__in=['DECLINED','COMPLETED','NEGOTIATING','CANCELLED']
            ).exists():
                toms = CropM.objects.filter(name='Tomatoes').first()
                beans_c = CropM.objects.filter(name='Beans').first()
                avos = CropM.objects.filter(name='Avocados').first()
                maize_c = CropM.objects.filter(name='Maize').first()
                pots = CropM.objects.filter(name='Potatoes').first()
                if all([toms, beans_c, avos, maize_c, pots]) and len(demo_coops) >= 2:
                    samples = [
                        dict(distributor=dist, cooperative=demo_coops[0], crop=toms,
                             quantity_kg=1200, quality_grade_required='A',
                             required_delivery_date=(now+datetime.timedelta(days=5)).date(),
                             status='DECLINED', cooperative_response_notes='Cooperative could not meet the delivery date.'),
                        dict(distributor=dist, cooperative=demo_coops[1], crop=beans_c,
                             quantity_kg=800, quality_grade_required='B',
                             required_delivery_date=(now+datetime.timedelta(days=10)).date(),
                             status='DECLINED', cooperative_response_notes='Quantity exceeds current stock.'),
                        dict(distributor=dist, cooperative=demo_coops[0], crop=avos,
                             quantity_kg=600, quality_grade_required='A',
                             required_delivery_date=(now+datetime.timedelta(days=14)).date(),
                             status='NEGOTIATING', additional_notes='Discussing adjusted quantity of 500 kg.'),
                        dict(distributor=dist, cooperative=demo_coops[0], crop=maize_c,
                             quantity_kg=2000, quality_grade_required='B',
                             required_delivery_date=(now-datetime.timedelta(days=20)).date(),
                             status='COMPLETED', cooperative_response_notes='Full delivery received and confirmed.'),
                        dict(distributor=dist, cooperative=demo_coops[1], crop=pots,
                             quantity_kg=1500, quality_grade_required='A',
                             required_delivery_date=(now-datetime.timedelta(days=35)).date(),
                             status='COMPLETED', cooperative_response_notes='Completed with 3% transit loss.'),
                        dict(distributor=dist, cooperative=demo_coops[1], crop=avos,
                             quantity_kg=400, quality_grade_required='A',
                             required_delivery_date=(now-datetime.timedelta(days=10)).date(),
                             status='CANCELLED', additional_notes='Cancelled — sourced from alternative cooperative.'),
                    ]
                    for data in samples:
                        ProduceRequest.objects.create(**data)
                    self.stdout.write('  Created 6 demo produce requests (DECLINED/NEGOTIATING/COMPLETED/CANCELLED).')

        # ── 8. Reset warehouse rental requests ────────────────────────────
        from apps.cooperatives.models import ColdStorageFacility, WarehouseRentalRequest, Cooperative

        # Reset accepted/declined rental requests back to PENDING
        accepted_rentals = WarehouseRentalRequest.objects.filter(status__in=['ACCEPTED', 'DECLINED'])
        accepted_rentals.update(status='PENDING', decline_reason='', responded_at=None)
        self.stdout.write(f'  Reset {accepted_rentals.count()} rental request(s) back to PENDING.')

        # Ensure at least 4 PENDING rental requests exist
        pending_rentals = WarehouseRentalRequest.objects.filter(status='PENDING').count()
        if pending_rentals < 4:
            fac1 = ColdStorageFacility.objects.filter(id=112).first()
            fac2 = ColdStorageFacility.objects.filter(id=113).first()
            demo_coops = list(Cooperative.objects.exclude(name__startswith='AUCA').order_by('id')[:3])
            if fac1 and fac2 and demo_coops:
                WarehouseRentalRequest.objects.filter(status='PENDING').delete()
                rental_data = [
                    (demo_coops[0], fac1, 500, 'Cold storage for tomato harvest — refrigeration needed.'),
                    (demo_coops[0], fac2, 800, 'Potato storage ahead of market season.'),
                    (demo_coops[1] if len(demo_coops) > 1 else demo_coops[0], fac1, 300, 'Avocado cold storage — Grade A export preparation.'),
                    (demo_coops[2] if len(demo_coops) > 2 else demo_coops[0], fac2, 1000, 'Emergency storage — recent harvest surplus.'),
                ]
                for c, f, kg, note in rental_data:
                    WarehouseRentalRequest.objects.create(cooperative=c, facility=f,
                        requested_capacity_kg=kg, notes=note, status='PENDING')
                self.stdout.write('  Created 4 fresh PENDING warehouse rental requests.')

        self.stdout.write(self.style.SUCCESS('\nDEMO STATE RESET. Ready for presentation!\n'))

        # ── Summary ────────────────────────────────────────────────────────
        self.stdout.write('TRANSPORT:')
        for company in [kalinda, gasana]:
            drivers = Transporter.objects.filter(parent_company=company)
            pending = TransportRequest.objects.filter(transporter=company, status='PENDING').count()
            self.stdout.write(f'  {company.company_name} — {pending} pending request(s), {drivers.count()} driver(s)')
        driver_pending = TransportRequest.objects.filter(
            transporter__in=Transporter.objects.filter(user__username__in=['driver.mugenzi','driver.uwase','driver.mutesi']),
            status='PENDING'
        ).count()
        self.stdout.write(f'  Individual drivers — {driver_pending} pending request(s)')

        self.stdout.write('WAREHOUSE:')
        rental_total = WarehouseRentalRequest.objects.filter(status='PENDING').count()
        self.stdout.write(f'  {rental_total} PENDING rental request(s) for warehouse manager to review')
