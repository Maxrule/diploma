from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


User = get_user_model()


class AuthCookieTests(TestCase):
    def test_login_sets_httponly_jwt_cookies(self):
        User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='pass12345',
            email_verified=True,
            is_active=True,
        )

        response = APIClient().post('/api/auth/token/', {
            'username': 'buyer',
            'password': 'pass12345',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
        self.assertTrue(response.cookies['access_token']['httponly'])
        self.assertNotIn('access', response.json())
        self.assertNotIn('refresh', response.json())
