from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Transporter, Vehicle, TransportRequest, Trip, GPSTrack, IncidentReport, TransporterRating
from .serializers import (
    TransporterSerializer, DriverSerializer, VehicleSerializer,
    TransportRequestSerializer, TripSerializer, TripListSerializer, GPSTrackSerializer,
    IncidentReportSerializer, TransporterRatingSerializer,
)
from apps.authentication.permissions import IsTransporter
from apps.notifications.models import Notification
from apps.notifications.services import notify


def _requester_user(req):
    """The user who should be notified about this TransportRequest's progress."""
    if req.requested_by_cooperative_id:
        return req.requested_by_cooperative.manager
    if req.requested_by_distributor_id:
        return req.requested_by_distributor.user
    return None


class TransporterViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransporterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('TRANSPORTER', 'TRANSPORT_COMPANY'):
            return Transporter.objects.filter(user=user)
        return Transporter.objects.filter(is_active=True)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsTransporter])
    def my(self, request):
        try:
            t = request.user.transporter_profile
        except Transporter.DoesNotExist:
            return Response({'detail': 'No transporter profile found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.method == 'PATCH':
            serializer = TransporterSerializer(t, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(TransporterSerializer(t).data)

    @action(detail=False, methods=['get'], url_path='my-drivers', permission_classes=[IsTransporter])
    def my_drivers(self, request):
        """
        Drivers registered under this Transport Company account, with their vehicles
        and whether each currently has an active trip. Only a company account (one with
        no parent_company of its own) has drivers — an individual driver calling this
        just gets an empty list, since they can't register sub-drivers of their own.
        """
        try:
            company = request.user.transporter_profile
        except Transporter.DoesNotExist:
            return Response({'detail': 'No transporter profile found.'}, status=status.HTTP_404_NOT_FOUND)
        if company.parent_company_id is not None:
            return Response(
                {'detail': "This account is a driver, not a transport company — it doesn't manage sub-drivers."},
                status=status.HTTP_403_FORBIDDEN,
            )
        drivers = company.drivers.select_related('user').prefetch_related('vehicles', 'transport_requests')
        return Response(DriverSerializer(drivers, many=True).data)

    @action(detail=False, methods=['get'], url_path='my-ratings', permission_classes=[IsTransporter])
    def my_ratings(self, request):
        """
        Average rating + recent feedback for this transporter — for a Transport Company,
        rolled up across every driver it registered too, since the rating reflects the
        company's reputation regardless of which driver actually ran the job.
        """
        from django.db.models import Avg, Count
        try:
            me = request.user.transporter_profile
        except Transporter.DoesNotExist:
            return Response({'detail': 'No transporter profile found.'}, status=status.HTTP_404_NOT_FOUND)

        ids = [me.id]
        if me.parent_company_id is None:
            ids += list(me.drivers.values_list('id', flat=True))

        ratings = TransporterRating.objects.filter(transporter_id__in=ids).select_related(
            'transporter__user', 'rated_by_cooperative', 'rated_by_distributor',
        )
        agg = ratings.aggregate(avg=Avg('rating'), count=Count('id'))
        return Response({
            'average_rating': round(agg['avg'], 1) if agg['avg'] is not None else None,
            'rating_count': agg['count'],
            'recent': TransporterRatingSerializer(ratings[:20], many=True).data,
        })

    @action(detail=False, methods=['post'], url_path='register-driver', permission_classes=[IsTransporter])
    def register_driver(self, request):
        """Transport Company account registers a driver — no admin approval needed."""
        import re
        import secrets
        import hashlib
        from datetime import timedelta
        from django.conf import settings
        from django.core.mail import send_mail
        from django.db import IntegrityError
        from apps.authentication.models import User, OTPRecord
        from apps.authentication.serializers import UserCreateSerializer

        try:
            company = request.user.transporter_profile
        except Transporter.DoesNotExist:
            return Response({'detail': 'No transporter profile found.'}, status=status.HTTP_404_NOT_FOUND)
        if company.parent_company_id is not None:
            return Response(
                {'detail': "This account is a driver, not a transport company — it can't register sub-drivers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        phone = request.data.get('phone_number', '')
        digits = re.sub(r'\D', '', phone)[-8:] or secrets.token_hex(4)
        base_username = request.data.get('username') or f'driver.{digits}'
        username = base_username
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}.{suffix}'
            suffix += 1

        data = {**request.data, 'role': 'TRANSPORTER', 'username': username}
        serializer = UserCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = serializer.save()
        except IntegrityError as e:
            err = str(e)
            if 'phone_number' in err:
                return Response({'phone_number': ['A user with this phone number already exists.']}, status=status.HTTP_400_BAD_REQUEST)
            if 'email' in err:
                return Response({'email': ['A user with this email already exists.']}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': 'Could not create user — a duplicate entry exists.'}, status=status.HTTP_400_BAD_REQUEST)

        operating_districts = request.data.get('operating_districts', company.operating_districts or ['Kigali'])
        if isinstance(operating_districts, str):
            operating_districts = [d.strip() for d in operating_districts.split(',') if d.strip()]

        Transporter.objects.create(
            user=user,
            # Deliberately left blank, not copied from the company: Transporter.__str__/name
            # prefers company_name over the user's own name, so setting it here would make
            # every driver under the same company display identically in lists. The company
            # affiliation is already captured via parent_company.
            operating_districts=operating_districts,
            parent_company=company,
            is_active=True,
        )

        otp_code = ''.join(secrets.choice('0123456789') for _ in range(6))
        otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
        expires_at = timezone.now() + timedelta(hours=getattr(settings, 'OTP_EXPIRY_HOURS', 24))
        OTPRecord.objects.create(
            user=user, otp_code=otp_hash,
            purpose=OTPRecord.Purpose.ACCOUNT_ACTIVATION, expires_at=expires_at,
        )
        if user.email:
            send_mail(
                'ChainSight — Activate Your Account',
                f"Hello {user.get_full_name()},\n\nYou have been registered as a driver on ChainSight by {company}.\n\nYour verification code is: {otp_code}\n\nThis code expires in 24 hours.\n\nChainSight Supply Chain Analytics System",
                settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True,
            )

        return Response({
            'message': f'Driver {user.get_full_name()} registered. OTP sent to {user.email or user.phone_number}.',
            'user_id': user.id,
            'otp_code': otp_code,  # shown in dev so the company can manually share it
        }, status=status.HTTP_201_CREATED)


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        if user.role in ('TRANSPORTER', 'TRANSPORT_COMPANY'):
            try:
                me = user.transporter_profile
            except Transporter.DoesNotExist:
                return Vehicle.objects.none()
            if user.role == 'TRANSPORT_COMPANY':
                # A company manages vehicles for itself and for every driver it registered.
                return Vehicle.objects.filter(Q(transporter=me) | Q(transporter__parent_company=me))
            return Vehicle.objects.filter(transporter=me)
        return Vehicle.objects.filter(is_active=True)

    def perform_create(self, serializer):
        user = self.request.user
        me = user.transporter_profile
        target = me
        driver_id = self.request.data.get('transporter')
        if user.role == 'TRANSPORT_COMPANY' and driver_id:
            driver = Transporter.objects.filter(id=driver_id, parent_company=me).first()
            if driver:
                target = driver
        serializer.save(transporter=target)


class TransportRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TransportRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                req = serializer.save(requested_by_cooperative=user.cooperative)
            except Exception:
                req = serializer.save()
        elif user.role == 'DISTRIBUTOR':
            try:
                req = serializer.save(requested_by_distributor=user.distributor_profile)
            except Exception:
                req = serializer.save()
        else:
            req = serializer.save()
        notify(
            req.transporter.user,
            Notification.NotificationType.TRANSPORT_REQUEST_RECEIVED,
            'New Transport Request',
            f'New pickup requested at {req.pickup_location} for {req.cargo_description}.',
            related_object_type='transport_request', related_object_id=req.id,
        )

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status')

        if user.role in ('TRANSPORTER', 'TRANSPORT_COMPANY'):
            try:
                qs = TransportRequest.objects.filter(transporter=user.transporter_profile)
            except Transporter.DoesNotExist:
                return TransportRequest.objects.none()
        elif user.role == 'COOPERATIVE_MANAGER':
            try:
                qs = TransportRequest.objects.filter(requested_by_cooperative=user.cooperative)
            except Exception:
                return TransportRequest.objects.none()
        elif user.role == 'DISTRIBUTOR':
            try:
                qs = TransportRequest.objects.filter(requested_by_distributor=user.distributor_profile)
            except Exception:
                return TransportRequest.objects.none()
        elif user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            qs = TransportRequest.objects.all()
        else:
            return TransportRequest.objects.none()

        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter])
    def accept(self, request, pk=None):
        req = self.get_object()
        if req.status != TransportRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = TransportRequest.Status.ACCEPTED
        req.accepted_at = timezone.now()
        req.save()
        Trip.objects.create(transport_request=req)
        notify(
            _requester_user(req),
            Notification.NotificationType.TRANSPORT_ACCEPTED,
            'Transport Request Accepted',
            f'{req.transporter} accepted the pickup at {req.pickup_location}.',
            related_object_type='transport_request', related_object_id=req.id,
        )
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter], url_path='assign-driver')
    def assign_driver(self, request, pk=None):
        """
        A Transport Company hands an incoming request off to one of its own drivers (and
        optionally a specific truck) instead of running it under the company account itself.
        Same end state as `accept` — status ACCEPTED, a Trip created — just landing on the
        driver's own Transporter row instead of the company's.
        """
        req = self.get_object()
        if request.user.role != 'TRANSPORT_COMPANY':
            return Response({'detail': 'Only a transport company account can assign drivers.'}, status=status.HTTP_403_FORBIDDEN)
        company = request.user.transporter_profile
        if req.transporter_id != company.id:
            return Response({'detail': 'This request is not addressed to your company.'}, status=status.HTTP_403_FORBIDDEN)
        if req.status != TransportRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)

        driver = Transporter.objects.filter(id=request.data.get('driver'), parent_company=company).first()
        if not driver:
            return Response({'detail': 'Driver not found under your company.'}, status=status.HTTP_400_BAD_REQUEST)

        vehicle = None
        vehicle_id = request.data.get('vehicle')
        if vehicle_id:
            # Vehicle must belong to the company fleet (owned by the company itself OR
            # by any of its registered drivers) — not restricted to the specific driver
            # chosen, since the company decides which truck to send per job.
            from django.db.models import Q as _Q
            vehicle = Vehicle.objects.filter(
                _Q(id=vehicle_id),
                _Q(transporter=company) | _Q(transporter__parent_company=company),
            ).first()
            if not vehicle:
                return Response({'detail': 'Vehicle not found in your company fleet.'}, status=status.HTTP_400_BAD_REQUEST)

        req.transporter = driver
        req.vehicle = vehicle
        req.status = TransportRequest.Status.ACCEPTED
        req.accepted_at = timezone.now()
        req.save()
        Trip.objects.create(transport_request=req)

        notify(
            driver.user,
            Notification.NotificationType.TRANSPORT_REQUEST_RECEIVED,
            'Job Assigned to You',
            f'{company} assigned you the pickup at {req.pickup_location} → {req.destination}.',
            related_object_type='transport_request', related_object_id=req.id,
        )
        notify(
            _requester_user(req),
            Notification.NotificationType.TRANSPORT_ACCEPTED,
            'Transport Request Accepted',
            f'{company} accepted the pickup at {req.pickup_location} and assigned driver {driver}.',
            related_object_type='transport_request', related_object_id=req.id,
        )
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter])
    def decline(self, request, pk=None):
        req = self.get_object()
        if req.status != TransportRequest.Status.PENDING:
            return Response({'detail': 'Request is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = request.data.get('reason', '')
        req.status = TransportRequest.Status.DECLINED
        req.decline_reason = reason
        req.save()
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def rate(self, request, pk=None):
        """
        The cooperative or distributor that requested this leg rates the transporter once it's
        delivered — one rating per completed request. Feeds the transporter/company's
        reputation on their own Company Profile.
        """
        req = self.get_object()
        user = request.user
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                owns_it = req.requested_by_cooperative_id == user.cooperative.id
            except Exception:
                owns_it = False
            rated_by = {'rated_by_cooperative': user.cooperative if owns_it else None}
        elif user.role == 'DISTRIBUTOR':
            try:
                owns_it = req.requested_by_distributor_id == user.distributor_profile.id
            except Exception:
                owns_it = False
            rated_by = {'rated_by_distributor': user.distributor_profile if owns_it else None}
        else:
            return Response({'detail': 'Only the cooperative or distributor that requested this leg can rate it.'}, status=status.HTTP_403_FORBIDDEN)

        if not owns_it:
            return Response({'detail': 'This request was not made by you.'}, status=status.HTTP_403_FORBIDDEN)
        if req.status != TransportRequest.Status.COMPLETED:
            return Response({'detail': 'This job has not been delivered yet.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(req, 'rating'):
            return Response({'detail': 'Already rated.'}, status=status.HTTP_400_BAD_REQUEST)

        rating_value = request.data.get('rating')
        try:
            rating_value = int(rating_value)
        except (TypeError, ValueError):
            rating_value = 0
        if not 1 <= rating_value <= 5:
            return Response({'detail': 'Rating must be between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)

        rating = TransporterRating.objects.create(
            transport_request=req, transporter=req.transporter,
            rating=rating_value, comment=request.data.get('comment', ''),
            **rated_by,
        )
        notify(
            req.transporter.user,
            Notification.NotificationType.TRANSPORT_ACCEPTED,
            'New Rating Received',
            f'You received a {rating_value}-star rating for the delivery to {req.destination}.',
            related_object_type='transport_request', related_object_id=req.id,
        )
        return Response(TransporterRatingSerializer(rating).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='create-multi-stop')
    def create_multi_stop(self, request):
        """
        Create several TransportRequests that share one pickup and one transporter — a single
        multi-stop run (e.g. one truck dropping different crops at several distributors).
        Each stop still gets its own independent status/Trip/delivery confirmation; only the
        pickup, transporter, and pickup time are shared across the run.
        Body: { transporter, leg_number, pickup_location, pickup_gps_lat, pickup_gps_lng,
                requires_refrigeration, required_pickup_datetime,
                stops: [{ destination, destination_gps_lat, destination_gps_lng,
                          cargo_description, estimated_cargo_weight_kg, notes }, ...] }
        """
        import uuid
        user = self.request.user
        stops = request.data.get('stops') or []
        if len(stops) < 1:
            return Response({'detail': 'Add at least one stop.'}, status=status.HTTP_400_BAD_REQUEST)

        shared = {k: v for k, v in request.data.items() if k != 'stops'}
        run_id = uuid.uuid4()
        created = []
        for i, stop in enumerate(stops, start=1):
            payload = {**shared, **stop, 'run_id': str(run_id), 'stop_sequence': i}
            serializer = TransportRequestSerializer(data=payload)
            if not serializer.is_valid():
                return Response({'stop': i, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            if user.role == 'COOPERATIVE_MANAGER':
                try:
                    req = serializer.save(requested_by_cooperative=user.cooperative)
                except Exception:
                    req = serializer.save()
            elif user.role == 'DISTRIBUTOR':
                try:
                    req = serializer.save(requested_by_distributor=user.distributor_profile)
                except Exception:
                    req = serializer.save()
            else:
                req = serializer.save()
            created.append(req)

        notify(
            created[0].transporter.user,
            Notification.NotificationType.TRANSPORT_REQUEST_RECEIVED,
            'New Multi-Stop Transport Request',
            f'New multi-stop run requested from {created[0].pickup_location} — {len(created)} stops.',
            related_object_type='transport_request', related_object_id=created[0].id,
        )
        return Response(TransportRequestSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class TripViewSet(viewsets.ModelViewSet):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return TripListSerializer
        return TripSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Trip.objects.select_related('transport_request')
        if user.role in ('TRANSPORTER', 'TRANSPORT_COMPANY'):
            try:
                return qs.filter(transport_request__transporter=user.transporter_profile)
            except Transporter.DoesNotExist:
                return Trip.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return qs.all()
        return Trip.objects.none()

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter], url_path='confirm-pickup')
    def confirm_pickup(self, request, pk=None):
        trip = self.get_object()
        trip.actual_pickup_datetime = timezone.now()
        trip.pickup_confirmed_at = timezone.now()
        trip.transport_request.status = TransportRequest.Status.IN_PROGRESS
        trip.transport_request.save()
        trip.save()
        req = trip.transport_request
        if req.requested_by_distributor_id:
            notify(
                req.requested_by_distributor.user,
                Notification.NotificationType.BATCH_IN_TRANSIT,
                'Batch Is Now In Transit',
                f'{req.transporter} picked up cargo from {req.pickup_location}.',
                related_object_type='trip', related_object_id=trip.id,
            )
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'], permission_classes=[IsTransporter], url_path='confirm-delivery')
    def confirm_delivery(self, request, pk=None):
        trip = self.get_object()
        trip.actual_delivery_datetime = timezone.now()
        trip.delivery_confirmed_at = timezone.now()
        trip.delivery_notes = request.data.get('notes', '')
        trip.transport_request.status = TransportRequest.Status.COMPLETED
        trip.transport_request.save()
        trip.save()
        req = trip.transport_request
        if req.requested_by_cooperative_id:
            notify(
                req.requested_by_cooperative.manager,
                Notification.NotificationType.DELIVERY_CONFIRMED,
                'Batch Delivered to Distributor',
                f'{req.transporter} delivered cargo to {req.destination}.',
                related_object_type='trip', related_object_id=trip.id,
            )
        elif req.requested_by_distributor_id:
            notify(
                req.requested_by_distributor.user,
                Notification.NotificationType.BATCH_DELIVERED,
                'Batch Arrived — Confirm Receipt',
                f'{req.transporter} delivered cargo to {req.destination}.',
                related_object_type='trip', related_object_id=trip.id,
            )
        return Response(TripSerializer(trip).data)

    @action(detail=False, methods=['get'], permission_classes=[IsTransporter])
    def active(self, request):
        """
        Return all of this transporter's currently active trips, as a list — always an array,
        even when there's just one (the common case). Trips sharing a `run_id` are stops on the
        same multi-stop run; the frontend groups them by `run_id` to show one combined view
        instead of separate unrelated trips.
        """
        try:
            t = request.user.transporter_profile
        except Exception:
            return Response({'detail': 'No transporter profile.'}, status=status.HTTP_404_NOT_FOUND)
        trips = Trip.objects.select_related(
            'transport_request__requested_by_cooperative',
            'transport_request__requested_by_distributor',
            'transport_request__vehicle',
        ).prefetch_related('gps_tracks').filter(
            transport_request__transporter=t,
            transport_request__status__in=[
                TransportRequest.Status.ACCEPTED,
                TransportRequest.Status.IN_PROGRESS,
            ],
        ).order_by('transport_request__run_id', 'transport_request__stop_sequence', '-created_at')
        if not trips:
            return Response({'detail': 'No active trip.'}, status=status.HTTP_404_NOT_FOUND)
        results = []
        for trip in trips:
            data = TripSerializer(trip).data
            req = trip.transport_request
            data['request'] = {
                'id': req.id,
                'pickup_location': req.pickup_location,
                'pickup_gps_lat': str(req.pickup_gps_lat) if req.pickup_gps_lat else None,
                'pickup_gps_lng': str(req.pickup_gps_lng) if req.pickup_gps_lng else None,
                'destination': req.destination,
                'destination_gps_lat': str(req.destination_gps_lat) if req.destination_gps_lat else None,
                'destination_gps_lng': str(req.destination_gps_lng) if req.destination_gps_lng else None,
                'cargo_description': req.cargo_description,
                'estimated_cargo_weight_kg': str(req.estimated_cargo_weight_kg),
                'requires_refrigeration': req.requires_refrigeration,
                'required_pickup_datetime': req.required_pickup_datetime,
                'requester_type': 'Cooperative' if req.requested_by_cooperative_id else 'Distributor',
                'requester_name': req.requested_by_cooperative.name if req.requested_by_cooperative else str(req.requested_by_distributor or '—'),
                'leg_number': req.leg_number,
                'status': req.status,
                'run_id': str(req.run_id) if req.run_id else None,
                'stop_sequence': req.stop_sequence,
            }
            results.append(data)
        return Response(results)

    @action(detail=False, methods=['get'], permission_classes=[IsTransporter], url_path='fleet-monitoring')
    def fleet_monitoring(self, request):
        """
        Vehicle IoT temperature readings + incident status across this transporter's own
        active trips — or, for a Transport Company account, across all its drivers' active
        trips too. Lets a transporter/company keep an eye on cold-chain compliance without
        digging into each individual trip.
        """
        from .services import fleet_monitoring_rows
        try:
            t = request.user.transporter_profile
        except Exception:
            return Response({'detail': 'No transporter profile.'}, status=status.HTTP_404_NOT_FOUND)

        transporter_ids = [t.id]
        if t.parent_company_id is None:
            transporter_ids += list(t.drivers.values_list('id', flat=True))

        return Response(fleet_monitoring_rows(transporter_ids))


class GPSTrackViewSet(viewsets.ModelViewSet):
    serializer_class = GPSTrackSerializer
    permission_classes = [IsTransporter]

    def get_queryset(self):
        try:
            return GPSTrack.objects.filter(
                trip__transport_request__transporter=self.request.user.transporter_profile
            )
        except Exception:
            return GPSTrack.objects.none()


class IncidentReportViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        if user.role in ('TRANSPORTER', 'TRANSPORT_COMPANY'):
            try:
                me = user.transporter_profile
            except Exception:
                return IncidentReport.objects.none()
            if user.role == 'TRANSPORT_COMPANY':
                # A company resolves incidents its drivers reported, not just ones tied to
                # its own (rarely-used) profile-level trips.
                return IncidentReport.objects.filter(
                    Q(trip__transport_request__transporter=me) |
                    Q(trip__transport_request__transporter__parent_company=me)
                )
            return IncidentReport.objects.filter(trip__transport_request__transporter=me)
        if user.role == 'COOPERATIVE_MANAGER':
            try:
                return IncidentReport.objects.filter(
                    trip__transport_request__requested_by_cooperative=user.cooperative
                )
            except Exception:
                return IncidentReport.objects.none()
        if user.role == 'DISTRIBUTOR':
            try:
                return IncidentReport.objects.filter(
                    trip__transport_request__requested_by_distributor=user.distributor_profile
                )
            except Exception:
                return IncidentReport.objects.none()
        if user.role in ('ADMIN', 'MINAGRI_OFFICER'):
            return IncidentReport.objects.all()
        return IncidentReport.objects.none()

    def perform_create(self, serializer):
        from django.db.models import Q
        from apps.traceability.models import Batch

        incident = serializer.save()
        req = incident.trip.transport_request
        # Link the alert straight to the batch riding on this trip — the cooperative/distributor
        # already has a page for batch detail (Traceability); point at that instead of inventing
        # a new "incident" page just to view what's essentially the same trip information.
        batch = Batch.objects.filter(
            Q(transport_request_leg1=req) | Q(transport_request_leg2=req)
        ).first()
        notify(
            _requester_user(req),
            Notification.NotificationType.INCIDENT_REPORTED,
            f'Transporter Reported: {incident.get_incident_type_display()}',
            f'{req.transporter} reported "{incident.get_incident_type_display()}" on the trip to {req.destination}. {incident.description}'.strip(),
            related_object_type='batch' if batch else 'incident_report',
            related_object_id=batch.id if batch else incident.id,
        )
