from .base import *
from decouple import config

DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

# Render (and most PaaS hosts) terminate TLS at their own proxy and forward plain HTTP
# to the app — without this, Django can't tell the original request was HTTPS and
# SECURE_SSL_REDIRECT causes an infinite redirect loop.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Security
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Use SMTP email in production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Only safe once `collectstatic` has actually run (true for a real deploy build only).
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
