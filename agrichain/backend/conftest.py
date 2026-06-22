"""Shared pytest fixtures for the Django test suite."""
import itertools
import pytest
from rest_framework.test import APIClient

_counter = itertools.count(1)


@pytest.fixture(autouse=True)
def _use_locmem_email_backend(settings):
    """Never hit the real SMTP server (Gmail) while running tests."""
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_user(db):
    """Factory fixture: make_user('DISTRIBUTOR', password='Pass1234!', email='x@y.com')."""
    from apps.authentication.models import User

    def _make(role, **overrides):
        n = next(_counter)
        defaults = dict(
            username=f'{role.lower()}.test{n}',
            email=f'{role.lower()}{n}@test.demo',
            phone_number=f'+25078811{n:04d}',
            first_name='Test',
            last_name='User',
            role=role,
            is_verified=True,
            must_change_password=False,
        )
        defaults.update(overrides)
        password = defaults.pop('password', 'TestPass123!')
        user = User(**defaults)
        user.set_password(password)
        user.save()
        return user

    return _make
