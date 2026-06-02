import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('agrichain')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ── Scheduled tasks (beat schedule) ──────────────────────────────────────────
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Nightly full data aggregation at 01:00 Kigali time
    'nightly-data-aggregation': {
        'task': 'apps.analytics.tasks.run_nightly_aggregation',
        'schedule': crontab(hour=1, minute=0),
    },
    # AI Insights Engine — runs after aggregation at 01:30
    'nightly-ai-insights': {
        'task': 'apps.ai_insights.tasks.generate_daily_insights',
        'schedule': crontab(hour=1, minute=30),
    },
    # Weekly KPI refresh every Monday at 02:00
    'weekly-kpi-refresh': {
        'task': 'apps.analytics.tasks.refresh_weekly_kpis',
        'schedule': crontab(hour=2, minute=0, day_of_week='monday'),
    },
    # Monthly trend computation on 1st of month at 03:00
    'monthly-trends': {
        'task': 'apps.analytics.tasks.compute_monthly_trends',
        'schedule': crontab(hour=3, minute=0, day_of_month='1'),
    },
    # Weekly national KPI report generation every Monday at 03:00
    'weekly-national-kpi-report': {
        'task': 'apps.reports.tasks.generate_national_kpi_report',
        'schedule': crontab(hour=3, minute=0, day_of_week='monday'),
    },
    # Monthly district/crop/cold chain reports on 1st of month at 04:00
    'monthly-reports': {
        'task': 'apps.reports.tasks.generate_monthly_reports',
        'schedule': crontab(hour=4, minute=0, day_of_month='1'),
    },
    # Cooperative reliability score recalculation every Monday at 05:00
    'weekly-reliability-scores': {
        'task': 'apps.cooperatives.tasks.recalculate_reliability_scores',
        'schedule': crontab(hour=5, minute=0, day_of_week='monday'),
    },
    # IoT simulation (development only) — generates mock sensor data every 15 min
    'iot-simulation': {
        'task': 'apps.iot.tasks.simulate_sensor_readings',
        'schedule': crontab(minute='*/15'),
    },
}
