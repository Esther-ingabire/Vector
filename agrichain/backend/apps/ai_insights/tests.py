"""
Tests for the AI Insights daily brief endpoint consumed by the MINAGRI dashboard.
"""
import datetime
import pytest
from rest_framework import status


@pytest.mark.django_db
class TestDailyBrief:

    def test_latest_returns_the_most_recent_bundle(self, api_client, make_user):
        from apps.ai_insights.models import AIInsight, DailyBriefBundle

        officer = make_user('MINAGRI_OFFICER', password='Pass1234!')
        api_client.force_authenticate(user=officer)

        insight = AIInsight.objects.create(
            insight_type=AIInsight.InsightType.NATIONAL_LOSS,
            title='Test national loss summary',
            content='Some computed content.',
            data_period_start=datetime.date(2026, 5, 1),
            data_period_end=datetime.date(2026, 5, 31),
        )
        bundle = DailyBriefBundle.objects.create(
            brief_date=datetime.date.today(),
            summary_text='1 insight generated for the test period.',
        )
        bundle.insights.set([insight])

        res = api_client.get('/api/v1/ai-insights/daily-brief/latest/')

        assert res.status_code == status.HTTP_200_OK
        assert res.data['summary_text'] == '1 insight generated for the test period.'
        assert len(res.data['insights']) == 1
        assert res.data['insights'][0]['title'] == 'Test national loss summary'

    def test_no_bundle_yet_returns_a_friendly_message_not_an_error(self, api_client, make_user):
        officer = make_user('MINAGRI_OFFICER', password='Pass1234!')
        api_client.force_authenticate(user=officer)

        res = api_client.get('/api/v1/ai-insights/daily-brief/latest/')

        assert res.status_code == status.HTTP_200_OK
        assert 'detail' in res.data

    def test_roles_outside_minagri_and_admin_are_forbidden(self, api_client, make_user):
        agent = make_user('MARKET_AGENT', password='Pass1234!')
        api_client.force_authenticate(user=agent)

        res = api_client.get('/api/v1/ai-insights/daily-brief/latest/')

        assert res.status_code == status.HTTP_403_FORBIDDEN
