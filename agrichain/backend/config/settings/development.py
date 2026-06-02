from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Use console email backend in development so OTPs print to terminal
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Allow all CORS origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Django debug toolbar (optional — install separately)
INTERNAL_IPS = ['127.0.0.1']
