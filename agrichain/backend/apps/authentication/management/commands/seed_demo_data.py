"""
Management command: seed_demo_data
Usage: python manage.py seed_demo_data [--reset]

Seeds the database with 6 months of realistic Rwandan agricultural data
so every ChainSight dashboard, chart, and report shows meaningful numbers
during a supervisor demo.

Creates: 4 cooperatives · 2 transporters · 2 distributors · 3 market agents
         1 MINAGRI officer · 1 admin · 48 batches (6 months × 4 districts)
         transport trips · orders · collection confirmations · waste reports
"""

import random
import uuid
from datetime import date, timedelta, datetime

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

DEMO_PASSWORD = 'Demo1234!'
random.seed(42)  # reproducible data


def rnd(lo, hi):
    return round(random.uniform(lo, hi), 2)


# ── Crop master data ─────────────────────────────────────────────────────────

CROPS = [
    # (name, category, cold_chain, amber_hrs, red_hrs, amber_temp, red_temp)
    ('Tomatoes',       'PERISHABLE',  True,   4.0,  8.0, 25.0, 30.0),
    ('Maize',          'DRY_GOODS',   False, 48.0, 96.0, None, None),
    ('Coffee',         'DRY_GOODS',   False, 72.0, 144.0, None, None),
    ('Bananas',        'FRUITS',      False,  6.0, 12.0, 28.0, 33.0),
    ('Potatoes',       'ROOT_TUBERS', False, 24.0, 72.0, None, None),
    ('Sweet Potatoes', 'ROOT_TUBERS', False, 24.0, 72.0, None, None),
    ('Avocados',       'FRUITS',      False,  8.0, 16.0, 22.0, 28.0),
    ('Sorghum',        'DRY_GOODS',   False, 48.0, 96.0, None, None),
]

# ── District configuration ───────────────────────────────────────────────────

DISTRICT_CFG = {
    'Musanze': {
        'coop_name': 'Musanze Farmers Cooperative',
        'reg_no':    'RCA/MUS/2019/001',
        'sector':    'Kinigi',
        'crop_names': ['Tomatoes', 'Maize'],
        'transit_loss': (9.0, 14.0),
        'market_loss':  (5.0,  7.5),
        'transit_hrs':  (3.5,  5.5),
        'pickup_loc':   'Musanze Market Hub, Northern Province',
        'gps': (-1.4996, 29.6342),
        'manager': {
            'username': 'coop.musanze', 'first_name': 'Jean',
            'last_name': 'Habimana', 'phone': '+250788100001',
            'email': 'j.habimana@chainsight.demo',
        },
    },
    'Rubavu': {
        'coop_name': 'Rubavu Farmers Union',
        'reg_no':    'RCA/RUB/2020/007',
        'sector':    'Gisenyi',
        'crop_names': ['Coffee', 'Bananas'],
        'transit_loss': (7.0, 11.0),   # MEDIUM-HIGH
        'market_loss':  (4.0,  6.5),
        'transit_hrs':  (4.0,  6.0),
        'pickup_loc':   'Rubavu Produce Center, Western Province',
        'gps': (-1.7005, 29.2565),
        'manager': {
            'username': 'coop.rubavu', 'first_name': 'Immaculée',
            'last_name': 'Mukamana', 'phone': '+250788100002',
            'email': 'i.mukamana@chainsight.demo',
        },
    },
    'Nyanza': {
        'coop_name': 'Nyanza Agricultural Cooperative',
        'reg_no':    'RCA/NYA/2018/003',
        'sector':    'Busasamana',
        'crop_names': ['Potatoes', 'Sweet Potatoes'],
        'transit_loss': (4.0,  7.5),   # MEDIUM
        'market_loss':  (3.0,  5.5),
        'transit_hrs':  (2.0,  3.5),
        'pickup_loc':   'Nyanza Collection Point, Southern Province',
        'gps': (-2.3527, 29.7497),
        'manager': {
            'username': 'coop.nyanza', 'first_name': 'Marie Claire',
            'last_name': 'Uwimana', 'phone': '+250788100003',
            'email': 'mc.uwimana@chainsight.demo',
        },
    },
    'Kigali': {
        'coop_name': 'Kigali Urban Farmers Cooperative',
        'reg_no':    'RCA/KGL/2021/012',
        'sector':    'Nyarugenge',
        'crop_names': ['Avocados', 'Maize'],
        'transit_loss': (2.0,  5.0),   # LOW — short urban transit
        'market_loss':  (2.0,  3.5),
        'transit_hrs':  (1.5,  2.5),
        'pickup_loc':   'Kigali Farm Hub, Nyarugenge District',
        'gps': (-1.9441, 30.0619),
        'manager': {
            'username': 'coop.kigali', 'first_name': 'Patrick',
            'last_name': 'Habimana', 'phone': '+250788100004',
            'email': 'p.habimana@chainsight.demo',
        },
    },
}

# ── Monthly loss multipliers (trend: improving then slight uptick) ───────────
# index 0 = December 2025, index 5 = May 2026
MONTH_MULTIPLIERS = [1.18, 1.10, 1.05, 0.96, 0.90, 0.97]

MONTHS = [
    (2025, 12), (2026, 1), (2026, 2), (2026, 3), (2026, 4), (2026, 5),
]


class Command(BaseCommand):
    help = 'Seeds ChainSight with 6 months of realistic demo data for supervisor presentation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help='Delete existing demo data before re-seeding',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.authentication.models import User
        from apps.cooperatives.models import Crop

        if options['reset']:
            self._reset()

        if User.objects.filter(username='demo.admin').exists():
            self.stdout.write(self.style.WARNING(
                'Demo data already exists. Run with --reset to clear and re-seed.'
            ))
            return

        self.stdout.write(self.style.MIGRATE_HEADING(
            '\nSeeding ChainSight demo data for supervisor presentation...\n'
        ))

        crops        = self._seed_crops()
        users        = self._seed_special_users()
        coops        = self._seed_cooperatives(crops)
        transporters = self._seed_transporters(coops)
        distributors = self._seed_distributors()
        agents       = self._seed_market_agents()
        self._seed_batches(coops, transporters, distributors, agents, crops)
        self._seed_storage_facilities(coops)
        self._seed_pending_requests(coops, distributors, crops)

        self.stdout.write(self.style.SUCCESS('\nDemo data seeded successfully!\n'))
        self._print_credentials()

    # ── Reset ────────────────────────────────────────────────────────────────

    def _reset(self):
        from apps.authentication.models import User
        from apps.market_agents.models import WasteReport, CollectionConfirmation, MarketAgent
        from apps.distribution.models import Order, CollectionNotice, SupplyAgreement, ProduceRequest, Distributor, DistributorMarketAgentLink
        from apps.traceability.models import Batch
        from apps.transport.models import Trip, TransportRequest, Vehicle, Transporter
        from apps.cooperatives.models import CooperativeStock, Cooperative, ColdStorageFacility
        from apps.iot.models import IoTReading

        demo_usernames = (
            ['demo.admin', 'demo.minagri'] +
            [cfg['manager']['username'] for cfg in DISTRICT_CFG.values()] +
            ['trans.kalinda', 'trans.gasana', 'dist.kigali', 'dist.north',
             'agent.kimironko', 'agent.nyabugogo', 'agent.remera']
        )
        self.stdout.write('  Removing existing demo data...')
        # Delete in dependency order (deepest first)
        IoTReading.objects.filter(facility__cooperative__manager__username__in=demo_usernames).delete()
        ColdStorageFacility.objects.filter(cooperative__manager__username__in=demo_usernames).delete()
        WasteReport.objects.filter(market_agent__user__username__in=demo_usernames).delete()
        CollectionConfirmation.objects.filter(market_agent__user__username__in=demo_usernames).delete()
        Order.objects.filter(distributor__user__username__in=demo_usernames).delete()
        CollectionNotice.objects.filter(distributor__user__username__in=demo_usernames).delete()
        ProduceRequest.objects.filter(distributor__user__username__in=demo_usernames).delete()
        ProduceRequest.objects.filter(cooperative__manager__username__in=demo_usernames).delete()
        Batch.objects.filter(cooperative__manager__username__in=demo_usernames).delete()
        Trip.objects.filter(transport_request__transporter__user__username__in=demo_usernames).delete()
        TransportRequest.objects.filter(transporter__user__username__in=demo_usernames).delete()
        TransportRequest.objects.filter(requested_by_cooperative__manager__username__in=demo_usernames).delete()
        Vehicle.objects.filter(transporter__user__username__in=demo_usernames).delete()
        Transporter.objects.filter(user__username__in=demo_usernames).delete()
        DistributorMarketAgentLink.objects.filter(distributor__user__username__in=demo_usernames).delete()
        DistributorMarketAgentLink.objects.filter(market_agent__user__username__in=demo_usernames).delete()
        CooperativeStock.objects.filter(cooperative__manager__username__in=demo_usernames).delete()
        Cooperative.objects.filter(manager__username__in=demo_usernames).delete()
        # Delete profile objects before their protected User FK
        Distributor.objects.filter(user__username__in=demo_usernames).delete()
        MarketAgent.objects.filter(user__username__in=demo_usernames).delete()
        User.objects.filter(username__in=demo_usernames).delete()

    # ── Crops ────────────────────────────────────────────────────────────────

    def _seed_crops(self):
        from apps.cooperatives.models import Crop
        self.stdout.write('  Seeding crops...')
        crop_map = {}
        for name, cat, cold, a_hrs, r_hrs, a_temp, r_temp in CROPS:
            crop, _ = Crop.objects.get_or_create(
                name=name,
                defaults=dict(
                    category=cat,
                    requires_cold_chain=cold,
                    safe_transit_hours_amber=a_hrs,
                    safe_transit_hours_red=r_hrs,
                    safe_temp_max_amber=a_temp,
                    safe_temp_max_red=r_temp,
                ),
            )
            crop_map[name] = crop
        self.stdout.write(f'    {len(crop_map)} crops ready')
        return crop_map

    # ── Special users (admin + MINAGRI) ─────────────────────────────────────

    def _seed_special_users(self):
        from apps.authentication.models import User
        self.stdout.write('  Seeding admin & MINAGRI users...')
        users = {}

        admin, _ = User.objects.get_or_create(
            username='demo.admin',
            defaults=dict(
                first_name='System', last_name='Administrator',
                email='admin@chainsight.demo',
                role='ADMIN', phone_number='+250788000001',
                organization_name='MINAGRI / ChainSight',
                is_verified=True, must_change_password=False,
                is_staff=True, is_superuser=True,
            ),
        )
        admin.set_password(DEMO_PASSWORD)
        admin.save()
        users['admin'] = admin

        minagri, _ = User.objects.get_or_create(
            username='demo.minagri',
            defaults=dict(
                first_name='Claudine', last_name='Nzeyimana',
                email='c.nzeyimana@minagri.demo',
                role='MINAGRI_OFFICER', phone_number='+250788000002',
                organization_name='MINAGRI',
                is_verified=True, must_change_password=False,
            ),
        )
        minagri.set_password(DEMO_PASSWORD)
        minagri.save()
        users['minagri'] = minagri

        return users

    # ── Cooperatives ─────────────────────────────────────────────────────────

    def _seed_cooperatives(self, crops):
        from apps.authentication.models import User
        from apps.cooperatives.models import Cooperative, CooperativeStock
        self.stdout.write('  Seeding cooperatives...')
        coop_map = {}

        for district, cfg in DISTRICT_CFG.items():
            m = cfg['manager']
            mgr, _ = User.objects.get_or_create(
                username=m['username'],
                defaults=dict(
                    first_name=m['first_name'], last_name=m['last_name'],
                    email=m['email'], phone_number=m['phone'],
                    role='COOPERATIVE_MANAGER',
                    organization_name=cfg['coop_name'],
                    district=district,
                    is_verified=True, must_change_password=False,
                ),
            )
            mgr.set_password(DEMO_PASSWORD)
            mgr.save()

            coop, created = Cooperative.objects.get_or_create(
                registration_number=cfg['reg_no'],
                defaults=dict(
                    manager=mgr,
                    name=cfg['coop_name'],
                    district=district,
                    sector=cfg['sector'],
                    gps_latitude=cfg['gps'][0],
                    gps_longitude=cfg['gps'][1],
                    contact_phone=m['phone'],
                    contact_email=m['email'],
                    reliability_score=round(random.uniform(3.5, 4.8), 2),
                    on_time_dispatch_rate=round(random.uniform(78, 96), 2),
                    quality_consistency_rate=round(random.uniform(80, 95), 2),
                    total_batches_dispatched=random.randint(40, 120),
                ),
            )
            if not created:
                coop.manager = mgr
                coop.reliability_score = round(random.uniform(3.5, 4.8), 2)
                coop.on_time_dispatch_rate = round(random.uniform(78, 96), 2)
                coop.quality_consistency_rate = round(random.uniform(80, 95), 2)
                coop.total_batches_dispatched = random.randint(40, 120)
                coop.save()
            coop.crops_specialised.set([crops[n] for n in cfg['crop_names'] if n in crops])
            coop_map[district] = (coop, mgr)

            # Stock records
            for crop_name in cfg['crop_names']:
                if crop_name in crops:
                    stock, created = CooperativeStock.objects.get_or_create(
                        cooperative=coop,
                        crop=crops[crop_name],
                        defaults=dict(
                            quantity_kg=round(random.uniform(200, 700), 2),
                            quality_grade=random.choice(['A', 'A', 'B']),
                            harvest_date=date(2026, 6, 1),
                            available_from=date(2026, 6, 5),
                            is_available=True,
                        ),
                    )
                    if not created:
                        stock.quantity_kg = round(random.uniform(200, 700), 2)
                        stock.is_available = True
                        stock.harvest_date = date(2026, 6, 1)
                        stock.available_from = date(2026, 6, 5)
                        stock.save()

        self.stdout.write(f'    {len(coop_map)} cooperatives ready')
        return coop_map

    # ── Transporters ─────────────────────────────────────────────────────────

    def _seed_transporters(self, coops):
        from apps.authentication.models import User
        from apps.transport.models import Transporter, Vehicle
        self.stdout.write('  Seeding transporters...')

        trans_data = [
            {
                'username': 'trans.kalinda', 'first_name': 'Alain', 'last_name': 'Kalinda',
                'phone': '+250788200001', 'email': 'a.kalinda@chainsight.demo',
                'company': 'Kalinda Transport Co.', 'districts': ['Musanze', 'Rubavu', 'Kigali'],
                'plates': [('RAD 781 A', 'STANDARD_TRUCK', 5000), ('RAD 203 B', 'REFRIGERATED', 3000)],
                'reg_coop': 'Musanze',
            },
            {
                'username': 'trans.gasana', 'first_name': 'Eric', 'last_name': 'Gasana',
                'phone': '+250788200002', 'email': 'e.gasana@chainsight.demo',
                'company': 'Gasana Logistics Ltd', 'districts': ['Nyanza', 'Kigali'],
                'plates': [('RAD 554 C', 'PICKUP', 2000)],
                'reg_coop': 'Nyanza',
            },
        ]

        trans_map = {}
        for td in trans_data:
            user, _ = User.objects.get_or_create(
                username=td['username'],
                defaults=dict(
                    first_name=td['first_name'], last_name=td['last_name'],
                    email=td['email'], phone_number=td['phone'],
                    role='TRANSPORTER', organization_name=td['company'],
                    is_verified=True, must_change_password=False,
                ),
            )
            user.set_password(DEMO_PASSWORD)
            user.save()

            reg_coop = coops[td['reg_coop']][0] if td['reg_coop'] in coops else None
            trans, _ = Transporter.objects.get_or_create(
                user=user,
                defaults=dict(
                    company_name=td['company'],
                    operating_districts=td['districts'],
                    registered_by_cooperative=reg_coop,
                ),
            )
            for plate, vtype, cap in td['plates']:
                Vehicle.objects.get_or_create(
                    plate_number=plate,
                    defaults=dict(
                        transporter=trans, vehicle_type=vtype,
                        capacity_kg=cap, operating_districts=td['districts'],
                    ),
                )
            trans_map[td['username']] = trans

        self.stdout.write(f'    {len(trans_map)} transporters ready')
        return trans_map

    # ── Distributors ─────────────────────────────────────────────────────────

    def _seed_distributors(self):
        from apps.authentication.models import User
        from apps.distribution.models import Distributor
        self.stdout.write('  Seeding distributors...')

        dist_data = [
            {
                'username': 'dist.kigali', 'first_name': 'Samuel', 'last_name': 'Nkurunziza',
                'phone': '+250788300001', 'email': 's.nkurunziza@chainsight.demo',
                'company': 'Kigali Fresh Distributors Ltd',
                'warehouse': 'Kimironko Wholesale Market, Kigali',
                'district': 'Kigali',
            },
            {
                'username': 'dist.north', 'first_name': 'Esperance', 'last_name': 'Ingabire',
                'phone': '+250788300002', 'email': 'e.ingabire@chainsight.demo',
                'company': 'Northern Rwanda Distributors',
                'warehouse': 'Nyabugogo Trade Hub, Kigali',
                'district': 'Kigali',
            },
        ]

        dist_map = {}
        for dd in dist_data:
            user, _ = User.objects.get_or_create(
                username=dd['username'],
                defaults=dict(
                    first_name=dd['first_name'], last_name=dd['last_name'],
                    email=dd['email'], phone_number=dd['phone'],
                    role='DISTRIBUTOR', organization_name=dd['company'],
                    is_verified=True, must_change_password=False,
                ),
            )
            user.set_password(DEMO_PASSWORD)
            user.save()

            dist, _ = Distributor.objects.get_or_create(
                user=user,
                defaults=dict(
                    company_name=dd['company'],
                    warehouse_location=dd['warehouse'],
                    district=dd['district'],
                    contact_phone=dd['phone'],
                ),
            )
            dist_map[dd['username']] = dist

        self.stdout.write(f'    {len(dist_map)} distributors ready')
        return dist_map

    # ── Market Agents ────────────────────────────────────────────────────────

    def _seed_market_agents(self):
        from apps.authentication.models import User
        from apps.market_agents.models import MarketAgent
        self.stdout.write('  Seeding market agents...')

        agent_data = [
            {
                'username': 'agent.kimironko', 'first_name': 'Grace', 'last_name': 'Uwera',
                'phone': '+250788400001', 'email': 'g.uwera@chainsight.demo',
                'stall': 'A-12', 'market': 'Kimironko Market', 'district': 'Kigali',
            },
            {
                'username': 'agent.nyabugogo', 'first_name': 'Emmanuel', 'last_name': 'Nshimiyimana',
                'phone': '+250788400002', 'email': 'e.nshimiyimana@chainsight.demo',
                'stall': 'B-07', 'market': 'Nyabugogo Market', 'district': 'Kigali',
            },
            {
                'username': 'agent.remera', 'first_name': 'Diane', 'last_name': 'Mukankusi',
                'phone': '+250788400003', 'email': 'd.mukankusi@chainsight.demo',
                'stall': 'C-03', 'market': 'Remera Vegetables Market', 'district': 'Kigali',
            },
        ]

        agent_map = {}
        for ad in agent_data:
            user, _ = User.objects.get_or_create(
                username=ad['username'],
                defaults=dict(
                    first_name=ad['first_name'], last_name=ad['last_name'],
                    email=ad['email'], phone_number=ad['phone'],
                    role='MARKET_AGENT', organization_name=ad['market'],
                    is_verified=True, must_change_password=False,
                ),
            )
            user.set_password(DEMO_PASSWORD)
            user.save()

            agent, _ = MarketAgent.objects.get_or_create(
                user=user,
                defaults=dict(
                    stall_number=ad['stall'], market_name=ad['market'],
                    market_district=ad['district'],
                ),
            )
            agent_map[ad['username']] = agent

        # Link all agents to both distributors
        from apps.distribution.models import DistributorMarketAgentLink, Distributor
        for dist in Distributor.objects.filter(user__username__in=['dist.kigali', 'dist.north']):
            for agent in agent_map.values():
                DistributorMarketAgentLink.objects.get_or_create(
                    distributor=dist, market_agent=agent,
                )

        self.stdout.write(f'    {len(agent_map)} market agents ready')
        return agent_map

    # ── Batches (core demo data) ─────────────────────────────────────────────

    def _seed_batches(self, coops, transporters, distributors, agents, crops):
        from apps.traceability.models import Batch
        from apps.transport.models import TransportRequest, Trip, Vehicle
        from apps.distribution.models import (
            Distributor, CollectionNotice, Order,
        )
        from apps.market_agents.models import CollectionConfirmation, WasteReport

        self.stdout.write('  Seeding batches, trips, orders, and waste reports...')

        dist_list  = list(distributors.values())
        trans_list = list(transporters.values())
        agent_list = list(agents.values())
        batch_count = 0

        for month_idx, (year, month) in enumerate(MONTHS):
            loss_mul = MONTH_MULTIPLIERS[month_idx]

            for district, cfg in DISTRICT_CFG.items():
                coop, mgr = coops[district]

                for batch_num in range(2):  # 2 batches per district per month
                    day = 5 + batch_num * 10 + random.randint(0, 4)
                    try:
                        dispatch_dt = timezone.make_aware(
                            datetime(year, month, min(day, 28), random.randint(6, 10), 0, 0)
                        )
                    except ValueError:
                        continue

                    crop_name = cfg['crop_names'][batch_num % len(cfg['crop_names'])]
                    crop = crops.get(crop_name)
                    if not crop:
                        continue

                    dispatch_kg = round(random.uniform(200, 800), 2)
                    grade = random.choices(['A', 'A', 'B', 'B', 'C'], weights=[3, 3, 3, 2, 1])[0]

                    # Loss rates for this district × month
                    t_lo, t_hi = cfg['transit_loss']
                    m_lo, m_hi = cfg['market_loss']
                    transit_pct = rnd(t_lo * loss_mul, t_hi * loss_mul)
                    market_pct  = rnd(m_lo * loss_mul, m_hi * loss_mul)

                    transit_loss_kg = round(dispatch_kg * transit_pct / 100, 2)
                    weight_at_dist  = round(dispatch_kg - transit_loss_kg, 2)
                    market_loss_kg  = round(weight_at_dist * market_pct / 100, 2)
                    total_loss_kg   = round(transit_loss_kg + market_loss_kg, 2)
                    total_loss_pct  = round(total_loss_kg / dispatch_kg * 100, 2)

                    transit_hrs = rnd(*cfg['transit_hrs'])
                    dist_receipt_dt = dispatch_dt + timedelta(hours=transit_hrs + 1)
                    trans = random.choice(trans_list)
                    dist  = random.choice(dist_list)
                    agent = random.choice(agent_list)

                    # Determine status — last month's 2nd batch stays in progress
                    is_completed = not (month_idx == 5 and batch_num == 1)

                    # TransportRequest (leg 1)
                    tr = TransportRequest.objects.create(
                        requested_by_cooperative=coop,
                        transporter=trans,
                        leg_number=1,
                        pickup_location=cfg['pickup_loc'],
                        destination=f"{dist.warehouse_location}",
                        cargo_description=f"{crop_name} — Grade {grade}",
                        estimated_cargo_weight_kg=dispatch_kg,
                        required_pickup_datetime=dispatch_dt + timedelta(hours=1),
                        status='COMPLETED' if is_completed else 'IN_PROGRESS',
                        accepted_at=dispatch_dt + timedelta(minutes=30),
                    )

                    # Batch
                    batch = Batch.objects.create(
                        cooperative=coop,
                        crop=crop,
                        dispatched_by=mgr,
                        dispatch_weight_kg=dispatch_kg,
                        quality_grade_at_dispatch=grade,
                        dispatch_timestamp=dispatch_dt,
                        transport_request_leg1=tr,
                        received_by_distributor=dist if is_completed else None,
                        weight_at_distributor_kg=weight_at_dist if is_completed else None,
                        quality_at_distributor=grade if is_completed else '',
                        distributor_receipt_timestamp=dist_receipt_dt if is_completed else None,
                        transit_loss_leg1_kg=transit_loss_kg if is_completed else None,
                        transit_loss_leg1_pct=round(transit_pct, 2) if is_completed else None,
                        market_spoilage_loss_kg=market_loss_kg if is_completed else None,
                        market_spoilage_loss_pct=round(market_pct, 2) if is_completed else None,
                        total_loss_kg=total_loss_kg if is_completed else None,
                        total_loss_pct=total_loss_pct if is_completed else None,
                        current_status='COMPLETED' if is_completed else 'IN_TRANSIT_LEG1',
                    )

                    if is_completed:
                        # Trip record
                        actual_pickup = dispatch_dt + timedelta(hours=1, minutes=random.randint(0, 30))
                        actual_delivery = actual_pickup + timedelta(hours=transit_hrs)
                        Trip.objects.create(
                            transport_request=tr,
                            actual_pickup_datetime=actual_pickup,
                            actual_delivery_datetime=actual_delivery,
                            pickup_confirmed_at=actual_pickup,
                            delivery_confirmed_at=actual_delivery,
                        )

                        # CollectionNotice → Order → CollectionConfirmation → WasteReport
                        notice = CollectionNotice.objects.create(
                            distributor=dist,
                            crop=crop,
                            available_quantity_kg=weight_at_dist,
                            collection_deadline=dist_receipt_dt + timedelta(days=3),
                            pickup_location=dist.warehouse_location,
                        )

                        order = Order.objects.create(
                            collection_notice=notice,
                            market_agent=agent,
                            distributor=dist,
                            quantity_requested_kg=weight_at_dist,
                            confirmed_quantity_kg=weight_at_dist,
                            delivery_method='SELF_COLLECTION',
                            status='COMPLETED',
                            confirmed_at=dist_receipt_dt + timedelta(hours=2),
                        )
                        batch.order = order
                        batch.save(update_fields=['order'])

                        # Collection confirmation (market agent picks up)
                        collect_dt = dist_receipt_dt + timedelta(hours=random.uniform(4, 24))
                        self_loss_kg  = round(weight_at_dist * rnd(0.5, 2.0) / 100, 2)
                        arrived_kg    = round(weight_at_dist - self_loss_kg, 2)
                        self_loss_pct = round(self_loss_kg / weight_at_dist * 100, 2) if weight_at_dist > 0 else 0

                        CollectionConfirmation.objects.create(
                            order=order,
                            market_agent=agent,
                            quantity_collected_kg=weight_at_dist,
                            collected_at=collect_dt,
                            step1_idempotency_key=uuid.uuid4(),
                            quantity_arrived_at_stall_kg=arrived_kg,
                            arrived_at=collect_dt + timedelta(hours=rnd(0.5, 1.5)),
                            step2_idempotency_key=uuid.uuid4(),
                            self_transport_loss_kg=self_loss_kg,
                            self_transport_loss_pct=self_loss_pct,
                        )

                        # Waste report (end of selling period)
                        period_start = collect_dt.date()
                        period_end   = period_start + timedelta(days=random.randint(3, 7))
                        discarded_kg = round(arrived_kg * rnd(2.0, 8.0) / 100, 2)
                        sold_kg      = round(arrived_kg - discarded_kg, 2)
                        spoilage_pct = round(discarded_kg / (sold_kg + discarded_kg) * 100, 2) if (sold_kg + discarded_kg) > 0 else 0

                        WasteReport.objects.create(
                            market_agent=agent,
                            order=order,
                            reporting_period_start=period_start,
                            reporting_period_end=period_end,
                            quantity_sold_kg=sold_kg,
                            quantity_discarded_kg=discarded_kg,
                            discard_reason=random.choice(['SPOILAGE', 'SPOILAGE', 'NO_DEMAND', 'DAMAGE']),
                            market_spoilage_loss_pct=spoilage_pct,
                            idempotency_key=uuid.uuid4(),
                        )

                    batch_count += 1

        self.stdout.write(f'    {batch_count} batches created (with trips, orders, confirmations, waste reports)')

    # ── Cold storage facilities + IoT readings ───────────────────────────────

    def _seed_storage_facilities(self, coops):
        from apps.cooperatives.models import ColdStorageFacility
        from apps.iot.models import IoTReading

        self.stdout.write('  Seeding storage facilities and IoT readings...')
        facility_defs = {
            'Musanze': [('Kinigi Cold Store A', 500, 12.0, 18.0)],
            'Rubavu':  [('Gisenyi Storage Unit 1', 300, 14.0, 20.0)],
            'Nyanza':  [('Nyanza Dry Store', 400, 20.0, 28.0)],
            'Kigali':  [('Nyarugenge Hub Store', 600, 15.0, 22.0)],
        }
        count = 0
        for district, facs in facility_defs.items():
            coop, _ = coops[district]
            for name, cap_kg, amber, red in facs:
                facility, _ = ColdStorageFacility.objects.get_or_create(
                    cooperative=coop, name=name,
                    defaults=dict(
                        capacity_kg=cap_kg,
                        has_iot_sensor=True,
                        sensor_device_id=f'ESP32-{district[:3].upper()}-01',
                        temp_threshold_amber_celsius=amber,
                        temp_threshold_red_celsius=red,
                        humidity_threshold_percent=85.0,
                        location_description=f'{district} district storage',
                        is_active=True,
                    ),
                )
                # Add a fresh IoT reading (normal range)
                base_temp = round(random.uniform(amber - 4, amber - 1), 1)
                IoTReading.objects.create(
                    facility=facility,
                    temperature_celsius=base_temp,
                    humidity_percent=round(random.uniform(60, 75), 1),
                    timestamp=timezone.now(),
                )
                count += 1
        self.stdout.write(f'    {count} storage facilities with IoT readings ready')

    # ── Pending produce requests ─────────────────────────────────────────────

    def _seed_pending_requests(self, coops, distributors, crops):
        from apps.distribution.models import ProduceRequest

        self.stdout.write('  Seeding pending produce requests...')
        dist_kigali = distributors.get('dist.kigali')
        dist_north  = distributors.get('dist.north')
        if not dist_kigali or not dist_north:
            return

        requests_cfg = [
            # (district, distributor, crop_name, qty_kg, grade, days_from_now)
            ('Musanze', dist_kigali, 'Tomatoes', 350, 'A', 14),
            ('Musanze', dist_north,  'Maize',    500, 'B', 21),
            ('Rubavu',  dist_kigali, 'Coffee',   400, 'A', 18),
            ('Nyanza',  dist_north,  'Potatoes', 450, 'B', 12),
            ('Kigali',  dist_kigali, 'Avocados', 300, 'A', 10),
        ]
        count = 0
        today = date.today()
        for district, dist, crop_name, qty, grade, days in requests_cfg:
            coop, _ = coops[district]
            crop = crops.get(crop_name)
            if not crop:
                continue
            due = today + timedelta(days=days)
            ProduceRequest.objects.get_or_create(
                distributor=dist, cooperative=coop, crop=crop,
                status='PENDING',
                defaults=dict(
                    quantity_kg=qty,
                    quality_grade_required=grade,
                    required_delivery_date=due,
                    additional_notes='',
                ),
            )
            count += 1
        self.stdout.write(f'    {count} pending produce requests created')

    # ── Credentials printout ─────────────────────────────────────────────────

    def _print_credentials(self):
        lines = [
            '',
            '=' * 60,
            ' DEMO LOGIN CREDENTIALS  (password: Demo1234!)',
            '=' * 60,
            f'  {"Role":<25} {"Username":<22}',
            '-' * 60,
            f'  {"Admin":<25} {"demo.admin":<22}',
            f'  {"MINAGRI Officer":<25} {"demo.minagri":<22}',
            f'  {"Cooperative (Musanze)":<25} {"j.habimana@chainsight.demo":<22}',
            f'  {"Cooperative (Rubavu)":<25} {"coop.rubavu":<22}',
            f'  {"Cooperative (Nyanza)":<25} {"coop.nyanza":<22}',
            f'  {"Cooperative (Kigali)":<25} {"coop.kigali":<22}',
            f'  {"Transporter 1":<25} {"trans.kalinda":<22}',
            f'  {"Transporter 2":<25} {"trans.gasana":<22}',
            f'  {"Distributor 1":<25} {"dist.kigali":<22}',
            f'  {"Distributor 2":<25} {"dist.north":<22}',
            f'  {"Market Agent (Kimironko)":<25} {"agent.kimironko":<22}',
            f'  {"Market Agent (Nyabugogo)":<25} {"agent.nyabugogo":<22}',
            f'  {"Market Agent (Remera)":<25} {"agent.remera":<22}',
            '=' * 60,
            '',
        ]
        for line in lines:
            self.stdout.write(self.style.SUCCESS(line))
