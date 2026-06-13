from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from listings.models import Category, Listing, Location
from .models import CanceledOrderLog, Order


User = get_user_model()


class OrderPaymentTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user('seller', password='pass12345', email_verified=True)
        self.buyer = User.objects.create_user('buyer', password='pass12345', email_verified=True)
        self.category = Category.objects.create(name='Тест', delivery_price=50)
        self.location = Location.objects.create(city='Київ')
        self.listing = Listing.objects.create(
            title='Bike',
            price='1000.00',
            user=self.seller,
            category=self.category,
            location=self.location,
        )

    def test_order_uses_mock_payment_without_card_fields(self):
        client = APIClient()
        client.force_authenticate(self.buyer)

        response = client.post('/api/orders/', {
            'listing': self.listing.id,
            'city': 'Львів',
            'delivery_price': 50,
            'final_price': 1050,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get()
        self.assertEqual(order.payment_provider, 'mock')
        self.assertTrue(order.payment_reference.startswith('mock_'))
        self.assertTrue(order.paid)
        self.assertNotIn('card_number', response.json())

    def test_paid_mock_order_can_be_canceled_by_owner(self):
        order = Order.objects.create(
            user=self.buyer,
            listing=self.listing,
            city='Львів',
            delivery_price=50,
            final_price=1050,
            paid=True,
            payment_provider='mock',
            payment_reference='mock_test',
        )
        self.listing.is_active = False
        self.listing.save(update_fields=['is_active'])

        client = APIClient()
        client.force_authenticate(self.buyer)

        response = client.delete(f'/api/orders/{order.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Order.objects.filter(id=order.id).exists())
        self.assertTrue(CanceledOrderLog.objects.filter(original_order_id=order.id).exists())
        self.listing.refresh_from_db()
        self.assertTrue(self.listing.is_active)

# Create your tests here.
