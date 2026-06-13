from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Category, Listing, Location


User = get_user_model()


class ListingSecurityTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user('owner', password='pass12345', email_verified=True)
        self.other = User.objects.create_user('other', password='pass12345', email_verified=True)
        self.category = Category.objects.create(name='Тест')
        self.location = Location.objects.create(city='Київ')
        self.listing = Listing.objects.create(
            title='Phone',
            description='Original',
            price='100.00',
            user=self.owner,
            category=self.category,
            location=self.location,
        )

    def test_non_owner_cannot_update_listing(self):
        client = APIClient()
        client.force_authenticate(self.other)

        response = client.patch(f'/api/listings/{self.listing.id}/', {'title': 'Hacked'}, format='json')

        self.assertEqual(response.status_code, 403)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.title, 'Phone')

    def test_authenticated_user_can_toggle_favorite_on_backend(self):
        client = APIClient()
        client.force_authenticate(self.other)

        response = client.post(f'/api/listings/favorites/{self.listing.id}/toggle/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_favorite'])
        self.assertTrue(self.listing.favorited_by.filter(user=self.other).exists())

# Create your tests here.
