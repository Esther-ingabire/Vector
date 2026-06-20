import csv
import io
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Report
from .serializers import ReportSerializer
from apps.authentication.permissions import IsAnalyticsRole


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAnalyticsRole]

    def get_queryset(self):
        qs = Report.objects.all()
        report_type = self.request.query_params.get('type')
        rpt_status = self.request.query_params.get('status')
        if report_type:
            qs = qs.filter(report_type=report_type)
        if rpt_status:
            qs = qs.filter(status=rpt_status)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            generated_by_user=self.request.user,
            status=Report.Status.QUEUED,
        )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        report = self.get_object()
        if report.status != Report.Status.READY or not report.file_path:
            return Response({'detail': 'Report is not ready for download.'},
                            status=status.HTTP_400_BAD_REQUEST)
        return FileResponse(report.file_path.open('rb'),
                            as_attachment=True,
                            filename=f"{report.title}.{report.format.lower()}")


# ─── Live CSV/PDF Export (role-aware, multi-type) ──────────────────────────

class ExportReportView(APIView):
    """
    GET /api/v1/reports/export/?report_type=<type>&file_format=csv|pdf
    (NOT "format" — DRF reserves that query param for its own content negotiation.)
    Streams a report for the authenticated user, as CSV (default) or PDF.
    report_type defaults to the primary report for each role.
    Available types per role:
      COOPERATIVE_MANAGER : batches | stock | transport
      TRANSPORTER         : jobs | performance
      DISTRIBUTOR         : orders | delivery-comparison
      MARKET_AGENT        : collections | waste
      MINAGRI_OFFICER     : national | districts | crops | transport
      ADMIN               : national | districts | crops | transport

    Each `_xxx` handler below returns (title, headers, rows, base_filename) — the
    CSV/PDF renderers are shared so both formats always stay in sync.
    """
    permission_classes = [permissions.IsAuthenticated]

    # ── dispatch table ──────────────────────────────────────────────────────
    _HANDLERS = {
        'COOPERATIVE_MANAGER': {
            'batches':   '_coop_batches',
            'stock':     '_coop_stock',
            'transport': '_coop_transport',
        },
        'TRANSPORTER': {
            'jobs':        '_trans_jobs',
            'performance': '_trans_performance',
        },
        'DISTRIBUTOR': {
            'orders':              '_dist_orders',
            'delivery-comparison': '_dist_delivery_comparison',
        },
        'MARKET_AGENT': {
            'collections': '_agent_collections',
            'waste':       '_agent_waste',
        },
        'MINAGRI_OFFICER': {
            'national':  '_national',
            'districts': '_national_districts',
            'crops':     '_national_crops',
            'transport': '_national_transport',
        },
        'ADMIN': {
            'national':  '_national',
            'districts': '_national_districts',
            'crops':     '_national_crops',
            'transport': '_national_transport',
        },
    }

    _DEFAULTS = {
        'COOPERATIVE_MANAGER': 'batches',
        'TRANSPORTER':         'jobs',
        'DISTRIBUTOR':         'orders',
        'MARKET_AGENT':        'collections',
        'MINAGRI_OFFICER':     'national',
        'ADMIN':               'national',
    }

    # ── shared renderers ────────────────────────────────────────────────────

    @staticmethod
    def _csv_response(headers, rows, base_filename):
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(headers)
        writer.writerows(rows)
        buf.seek(0)
        resp = HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = f'attachment; filename="{base_filename}.csv"'
        return resp

    @staticmethod
    def _pdf_response(title, headers, rows, base_filename, request):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.units import cm
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=landscape(A4),
            topMargin=1.5 * cm, bottomMargin=1.5 * cm, leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        )
        styles = getSampleStyleSheet()
        elements = [
            Paragraph(title, styles['Title']),
            Paragraph(
                f"Generated {timezone.now().strftime('%Y-%m-%d %H:%M')} by "
                f"{request.user.get_full_name() or request.user.phone_number} — ChainSight Supply Chain Analytics",
                styles['Normal'],
            ),
            Spacer(1, 0.5 * cm),
        ]

        if not rows:
            elements.append(Paragraph('No data available for this report.', styles['Normal']))
        else:
            table_data = [headers] + [[str(c) for c in row] for row in rows]
            table = Table(table_data, repeatRows=1)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#15803d')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 0.3 * cm))
            elements.append(Paragraph(f'{len(rows)} record(s).', styles['Normal']))

        doc.build(elements)
        buf.seek(0)
        resp = HttpResponse(buf.getvalue(), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{base_filename}.pdf"'
        return resp

    def get(self, request):
        role = request.user.role
        role_map = self._HANDLERS.get(role)
        if not role_map:
            return Response({'detail': 'No report available for this role.'}, status=403)

        report_type = request.query_params.get('report_type', self._DEFAULTS.get(role, ''))
        method_name = role_map.get(report_type)
        if not method_name:
            # Fall back to default for this role
            method_name = role_map.get(self._DEFAULTS.get(role, ''))
        if not method_name:
            return Response({'detail': f'Unknown report_type "{report_type}" for role {role}.'}, status=400)

        result = getattr(self, method_name)(request)
        if isinstance(result, Response):
            return result  # error path (e.g. missing profile)

        title, headers, rows, base_filename = result
        if request.query_params.get('file_format', 'csv').lower() == 'pdf':
            return self._pdf_response(title, headers, rows, base_filename, request)
        return self._csv_response(headers, rows, base_filename)

    # ── Cooperative Manager ─────────────────────────────────────────────────

    def _coop_batches(self, request):
        from apps.traceability.models import Batch
        try:
            coop = request.user.cooperative
        except Exception:
            return Response({'detail': 'No cooperative profile linked.'}, status=400)

        headers = [
            'Batch ID', 'Crop', 'Dispatch Weight (kg)', 'Status', 'Dispatch Date',
            'Transit Loss (kg)', 'Transit Loss (%)', 'Total Loss (kg)', 'Total Loss (%)',
        ]
        rows = [
            [
                str(b.batch_id)[:8], b.crop.name,
                float(b.dispatch_weight_kg),
                b.get_current_status_display(),
                b.dispatch_timestamp.strftime('%Y-%m-%d') if b.dispatch_timestamp else '',
                float(b.transit_loss_leg1_kg or 0), float(b.transit_loss_leg1_pct or 0),
                float(b.total_loss_kg or 0), float(b.total_loss_pct or 0),
            ]
            for b in Batch.objects.filter(cooperative=coop).select_related('crop')
        ]
        return f'Cooperative Batch Report — {coop.name}', headers, rows, 'cooperative_batch_report'

    def _coop_stock(self, request):
        from apps.cooperatives.models import CooperativeStock
        try:
            coop = request.user.cooperative
        except Exception:
            return Response({'detail': 'No cooperative profile linked.'}, status=400)

        headers = ['Crop', 'Quantity (kg)', 'Quality Grade', 'Harvest Date', 'Available From', 'Available']
        rows = [
            [
                s.crop.name, float(s.quantity_kg), s.quality_grade,
                s.harvest_date.strftime('%Y-%m-%d') if s.harvest_date else '',
                s.available_from.strftime('%Y-%m-%d') if s.available_from else '',
                'Yes' if s.is_available else 'No',
            ]
            for s in CooperativeStock.objects.filter(cooperative=coop).select_related('crop')
        ]
        return f'Cooperative Stock Report — {coop.name}', headers, rows, 'cooperative_stock_report'

    def _coop_transport(self, request):
        from apps.transport.models import TransportRequest
        try:
            coop = request.user.cooperative
        except Exception:
            return Response({'detail': 'No cooperative profile linked.'}, status=400)

        headers = [
            'Job ID', 'Route', 'Cargo', 'Weight (kg)',
            'Required Pickup', 'Status', 'Transporter',
        ]
        rows = [
            [
                j.id, f"{j.pickup_location} → {j.destination}",
                j.cargo_description, float(j.estimated_cargo_weight_kg or 0),
                j.required_pickup_datetime.strftime('%Y-%m-%d %H:%M') if j.required_pickup_datetime else '',
                j.status,
                j.transporter.company_name if j.transporter else '',
            ]
            for j in TransportRequest.objects.filter(
                requested_by_cooperative=coop
            ).select_related('transporter')
        ]
        return f'Cooperative Transport Report — {coop.name}', headers, rows, 'cooperative_transport_report'

    # ── Transporter ─────────────────────────────────────────────────────────

    def _trans_jobs(self, request):
        from apps.transport.models import TransportRequest
        try:
            transporter = request.user.transporter_profile
        except Exception:
            return Response({'detail': 'No transporter profile linked.'}, status=400)

        headers = [
            'Job ID', 'Route', 'Cargo', 'Weight (kg)', 'Status',
            'Required Pickup', 'Actual Pickup', 'Delivered', 'Transit Hrs',
        ]
        rows = []
        for j in TransportRequest.objects.filter(transporter=transporter):
            pickup = delivery = hrs = ''
            try:
                t = j.trip
                if t.actual_pickup_datetime:
                    pickup = t.actual_pickup_datetime.strftime('%Y-%m-%d %H:%M')
                if t.actual_delivery_datetime:
                    delivery = t.actual_delivery_datetime.strftime('%Y-%m-%d %H:%M')
                if t.actual_pickup_datetime and t.actual_delivery_datetime:
                    hrs = round(
                        (t.actual_delivery_datetime - t.actual_pickup_datetime).total_seconds() / 3600, 1
                    )
            except Exception:
                pass
            rows.append([
                j.id, f"{j.pickup_location} → {j.destination}",
                j.cargo_description, float(j.estimated_cargo_weight_kg or 0),
                j.status,
                j.required_pickup_datetime.strftime('%Y-%m-%d %H:%M') if j.required_pickup_datetime else '',
                pickup, delivery, hrs,
            ])
        return f'Transporter Jobs Report — {transporter}', headers, rows, 'transporter_jobs_report'

    def _trans_performance(self, request):
        from apps.transport.models import TransportRequest, Trip
        try:
            transporter = request.user.transporter_profile
        except Exception:
            return Response({'detail': 'No transporter profile linked.'}, status=400)

        routes: dict = {}
        for j in TransportRequest.objects.filter(transporter=transporter):
            route = f"{j.pickup_location} → {j.destination}"
            try:
                t = j.trip
                if t.actual_pickup_datetime and t.actual_delivery_datetime:
                    hrs = (t.actual_delivery_datetime - t.actual_pickup_datetime).total_seconds() / 3600
                    on_time = 1 if hrs <= 4.5 else 0
                    routes.setdefault(route, {'count': 0, 'on_time': 0, 'total_hrs': 0.0})
                    routes[route]['count'] += 1
                    routes[route]['on_time'] += on_time
                    routes[route]['total_hrs'] += hrs
            except Exception:
                pass

        headers = ['Route', 'Total Jobs', 'On-Time Deliveries', 'On-Time Rate (%)', 'Avg Transit Hrs']
        rows = [
            [
                route,
                d['count'],
                d['on_time'],
                round(d['on_time'] / d['count'] * 100, 1) if d['count'] else 0,
                round(d['total_hrs'] / d['count'], 1) if d['count'] else 0,
            ]
            for route, d in sorted(routes.items())
        ]
        return f'Transporter Performance Report — {transporter}', headers, rows, 'transporter_performance_report'

    # ── Distributor ─────────────────────────────────────────────────────────

    def _dist_orders(self, request):
        from apps.distribution.models import Order
        try:
            dist = request.user.distributor_profile
        except Exception:
            return Response({'detail': 'No distributor profile linked.'}, status=400)

        headers = [
            'Order ID', 'Crop', 'Market Agent', 'Requested (kg)',
            'Confirmed (kg)', 'Method', 'Status', 'Created',
        ]
        rows = []
        for o in Order.objects.filter(distributor=dist).select_related(
            'market_agent__user', 'collection_notice__crop'
        ):
            crop = o.collection_notice.crop.name if o.collection_notice and o.collection_notice.crop else ''
            agent = o.market_agent.user.get_full_name() if o.market_agent else ''
            rows.append([
                o.id, crop, agent,
                float(o.quantity_requested_kg or 0), float(o.confirmed_quantity_kg or 0),
                o.delivery_method, o.status,
                o.created_at.strftime('%Y-%m-%d') if o.created_at else '',
            ])
        return f'Distributor Orders Report — {dist}', headers, rows, 'distributor_orders_report'

    def _dist_delivery_comparison(self, request):
        from apps.distribution.models import Order
        from django.db.models import Sum, Count, Q
        try:
            dist = request.user.distributor_profile
        except Exception:
            return Response({'detail': 'No distributor profile linked.'}, status=400)

        headers = ['Delivery Method', 'Total Orders', 'Completed', 'Cancelled / Declined', 'Total Volume (kg)']
        rows = []
        for method in ['SELF_COLLECTION', 'TRANSPORTER_DELIVERY']:
            qs = Order.objects.filter(distributor=dist, delivery_method=method)
            agg = qs.aggregate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='COMPLETED')),
                cancelled=Count('id', filter=Q(status__in=['DECLINED', 'CANCELLED'])),
                volume=Sum('confirmed_quantity_kg'),
            )
            rows.append([
                method.replace('_', ' ').title(),
                agg['total'],
                agg['completed'],
                agg['cancelled'],
                round(float(agg['volume'] or 0), 2),
            ])
        return (
            f'Distributor Delivery Method Comparison — {dist}', headers, rows,
            'distributor_delivery_comparison_report',
        )

    # ── Market Agent ────────────────────────────────────────────────────────

    def _agent_collections(self, request):
        from apps.market_agents.models import CollectionConfirmation
        try:
            agent = request.user.market_agent_profile
        except Exception:
            return Response({'detail': 'No market agent profile linked.'}, status=400)

        headers = ['Date', 'Crop', 'Collected (kg)', 'Arrived (kg)', 'Loss (kg)', 'Loss (%)']
        rows = []
        for c in CollectionConfirmation.objects.filter(market_agent=agent).select_related(
            'order__collection_notice__crop'
        ):
            crop = (
                c.order.collection_notice.crop.name
                if c.order and c.order.collection_notice and c.order.collection_notice.crop
                else ''
            )
            rows.append([
                c.collected_at.strftime('%Y-%m-%d') if c.collected_at else '',
                crop,
                float(c.quantity_collected_kg or 0),
                float(c.quantity_arrived_at_stall_kg or 0),
                float(c.self_transport_loss_kg or 0),
                float(c.self_transport_loss_pct or 0),
            ])
        return f'Market Agent Collections Report — {agent}', headers, rows, 'market_agent_collections_report'

    def _agent_waste(self, request):
        from apps.market_agents.models import WasteReport
        try:
            agent = request.user.market_agent_profile
        except Exception:
            return Response({'detail': 'No market agent profile linked.'}, status=400)

        headers = [
            'Period Start', 'Period End', 'Sold (kg)', 'Discarded (kg)',
            'Discard Reason', 'Spoilage Loss (%)',
        ]
        rows = [
            [
                w.reporting_period_start.strftime('%Y-%m-%d') if w.reporting_period_start else '',
                w.reporting_period_end.strftime('%Y-%m-%d') if w.reporting_period_end else '',
                float(w.quantity_sold_kg or 0),
                float(w.quantity_discarded_kg or 0),
                w.discard_reason,
                float(w.market_spoilage_loss_pct or 0),
            ]
            for w in WasteReport.objects.filter(market_agent=agent).order_by('-reporting_period_end')
        ]
        return f'Market Agent Waste Report — {agent}', headers, rows, 'market_agent_waste_report'

    # ── MINAGRI / Admin ─────────────────────────────────────────────────────

    def _national(self, request):
        from apps.traceability.models import Batch
        from django.db.models import Avg, Sum, Count

        rows = [
            [
                r['cooperative__district'] or 'Unknown',
                r['crop__name'] or 'Unknown',
                r['batches'],
                round(float(r['volume_kg'] or 0), 2),
                round(float(r['avg_loss_pct'] or 0), 2),
                round(float(r['loss_kg'] or 0), 2),
            ]
            for r in (
                Batch.objects.filter(total_loss_pct__isnull=False)
                .values('cooperative__district', 'crop__name')
                .annotate(
                    batches=Count('id'),
                    volume_kg=Sum('dispatch_weight_kg'),
                    avg_loss_pct=Avg('total_loss_pct'),
                    loss_kg=Sum('total_loss_kg'),
                )
                .order_by('cooperative__district', '-avg_loss_pct')
            )
        ]
        headers = ['District', 'Crop', 'Batch Count', 'Volume (kg)', 'Avg Loss (%)', 'Total Loss (kg)']
        return 'National Supply Chain Report', headers, rows, 'national_supply_chain_report'

    def _national_districts(self, request):
        from apps.traceability.models import Batch
        from django.db.models import Avg, Sum, Count

        rows = [
            [
                r['cooperative__district'] or 'Unknown',
                r['batches'],
                round(float(r['volume_kg'] or 0), 2),
                round(float(r['avg_loss'] or 0), 2),
                round(float(r['total_loss'] or 0), 2),
                'HIGH' if float(r['avg_loss'] or 0) >= 12 else ('MEDIUM' if float(r['avg_loss'] or 0) >= 7 else 'LOW'),
            ]
            for r in (
                Batch.objects.filter(total_loss_pct__isnull=False)
                .values('cooperative__district')
                .annotate(
                    batches=Count('id'),
                    volume_kg=Sum('dispatch_weight_kg'),
                    avg_loss=Avg('total_loss_pct'),
                    total_loss=Sum('total_loss_kg'),
                )
                .order_by('-avg_loss')
            )
            if r['cooperative__district']
        ]
        headers = ['District', 'Batch Count', 'Volume (kg)', 'Avg Loss (%)', 'Total Loss (kg)', 'Risk Level']
        return 'National District Loss Report', headers, rows, 'national_districts_report'

    def _national_crops(self, request):
        from apps.traceability.models import Batch
        from django.db.models import Avg, Sum, Count

        rows = [
            [
                r['crop__name'] or 'Unknown',
                r['batches'],
                round(float(r['volume_kg'] or 0), 2),
                round(float(r['avg_loss'] or 0), 2),
                round(float(r['total_loss'] or 0), 2),
            ]
            for r in (
                Batch.objects.filter(total_loss_pct__isnull=False)
                .values('crop__name')
                .annotate(
                    batches=Count('id'),
                    volume_kg=Sum('dispatch_weight_kg'),
                    avg_loss=Avg('total_loss_pct'),
                    total_loss=Sum('total_loss_kg'),
                )
                .order_by('-avg_loss')
            )
        ]
        headers = ['Crop', 'Batch Count', 'Volume (kg)', 'Avg Loss (%)', 'Total Loss (kg)']
        return 'National Crop Loss Report', headers, rows, 'national_crops_report'

    def _national_transport(self, request):
        from apps.transport.models import TransportRequest, Trip
        from django.db.models import Count

        headers = ['Route', 'Total Jobs', 'Completed', 'Avg Transit Hrs', 'Avg Delay Hrs']
        routes: dict = {}

        for trip in Trip.objects.filter(
            actual_pickup_datetime__isnull=False,
            actual_delivery_datetime__isnull=False,
        ).select_related('transport_request'):
            req = trip.transport_request
            route = f"{req.pickup_location} → {req.destination}"
            hrs = (trip.actual_delivery_datetime - trip.actual_pickup_datetime).total_seconds() / 3600
            routes.setdefault(route, {'total': 0, 'hrs': 0.0})
            routes[route]['total'] += 1
            routes[route]['hrs'] += hrs

        completed_counts = {
            f"{j.pickup_location} → {j.destination}": 0
            for j in TransportRequest.objects.filter(status='COMPLETED')
        }
        for j in TransportRequest.objects.filter(status='COMPLETED'):
            key = f"{j.pickup_location} → {j.destination}"
            completed_counts[key] = completed_counts.get(key, 0) + 1

        rows = []
        for route, d in sorted(routes.items()):
            avg_hrs = round(d['hrs'] / d['total'], 1) if d['total'] else 0
            rows.append([
                route,
                d['total'],
                completed_counts.get(route, 0),
                avg_hrs,
                round(max(0, avg_hrs - 4.0), 1),
            ])
        return 'National Transport Performance Report', headers, rows, 'national_transport_report'
