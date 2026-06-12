from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Real SMTP email — credentials loaded from .env via base.py
# EMAIL_BACKEND stays as smtp.EmailBackend (set in base.py)

# Allow all CORS origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Django debug toolbar (optional — install separately)
INTERNAL_IPS = ['127.0.0.1']
