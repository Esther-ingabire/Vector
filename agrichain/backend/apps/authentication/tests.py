"""
Tests for login (credential matching against email/phone, never username) and
the registration-approval flow (admin can override the originally requested role).
"""
import pytest
from rest_framework import status

LOGIN_URL = '/api/v1/auth/login/'


@pytest.mark.django_db
class TestLogin:

    def test_login_with_email_succeeds(self, api_client, make_user):
        make_user('COOPERATIVE_MANAGER', email='coop@test.demo', password='Pass1234!')
        res = api_client.post(LOGIN_URL, {'credential': 'coop@test.demo', 'password': 'Pass1234!'})
        assert res.status_code == status.HTTP_200_OK
        assert 'access' in res.data
        assert res.data['user']['role'] == 'COOPERATIVE_MANAGER'

    def test_login_with_phone_number_succeeds(self, api_client, make_user):
        make_user('DISTRIBUTOR', phone_number='+250788123456', password='Pass1234!')
        res = api_client.post(LOGIN_URL, {'credential': '+250788123456', 'password': 'Pass1234!'})
        assert res.status_code == status.HTTP_200_OK

    def test_login_with_username_is_rejected(self, api_client, make_user):
        """
        Documents a real, easy-to-miss behaviour: the login field is labelled
        "Phone number or username" on the frontend, but the backend only ever
        matches against email or phone_number — a username never works.
        """
        make_user('DISTRIBUTOR', username='wont.login', password='Pass1234!')
        res = api_client.post(LOGIN_URL, {'credential': 'wont.login', 'password': 'Pass1234!'})
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_wrong_password_is_rejected(self, api_client, make_user):
        make_user('ADMIN', email='admin@test.demo', password='CorrectPass1!')
        res = api_client.post(LOGIN_URL, {'credential': 'admin@test.demo', 'password': 'WrongPass!'})
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_unverified_account_is_rejected(self, api_client, make_user):
        make_user('MARKET_AGENT', email='agent@test.demo', password='Pass1234!', is_verified=False)
        res = api_client.post(LOGIN_URL, {'credential': 'agent@test.demo', 'password': 'Pass1234!'})
        assert res.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAccessRequestApproval:

    def test_approve_creates_user_and_profile_matching_admin_selected_role(self, api_client, make_user):
        """
        The Registration Queue lets the admin pick a different role than the one the
        applicant originally requested. The created user, and its role-specific profile
        (Distributor / Cooperative / etc.), must follow the ADMIN'S choice, not the
        applicant's original request.
        """
        from apps.authentication.models import AccessRequest
        from apps.distribution.models import Distributor

        admin = make_user('ADMIN', password='AdminPass1!')
        api_client.force_authenticate(user=admin)

        req = AccessRequest.objects.create(
            full_name='Jane Applicant',
            role_requested='COOPERATIVE_MANAGER',
            organization_name='Test Org',
            district='Kigali',
            phone_number='+250788777001',
            email='jane@applicant.test',
            acknowledgement=True,
        )

        res = api_client.post(
            f'/api/v1/auth/access-requests/{req.id}/approve/',
            {
                'username': 'jane.distributor',
                'first_name': 'Jane',
                'last_name': 'Applicant',
                'email': 'jane@applicant.test',
                'phone_number': '+250788777001',
                'role': 'DISTRIBUTOR',  # admin overrides the originally requested role
                'organization_name': 'Test Org',
                'district': 'Kigali',
            },
            format='json',
        )

        assert res.status_code == status.HTTP_201_CREATED

        req.refresh_from_db()
        created_user = req.created_user
        assert created_user is not None
        assert created_user.role == 'DISTRIBUTOR'
        assert Distributor.objects.filter(user=created_user).exists()

    def test_non_admin_cannot_approve_requests(self, api_client, make_user):
        from apps.authentication.models import AccessRequest

        non_admin = make_user('COOPERATIVE_MANAGER', password='Pass1234!')
        api_client.force_authenticate(user=non_admin)

        req = AccessRequest.objects.create(
            full_name='Someone', role_requested='DISTRIBUTOR', organization_name='Org',
            district='Kigali', phone_number='+250788777002', email='someone@applicant.test',
            acknowledgement=True,
        )
        res = api_client.post(f'/api/v1/auth/access-requests/{req.id}/approve/', {}, format='json')
        assert res.status_code == status.HTTP_403_FORBIDDEN
