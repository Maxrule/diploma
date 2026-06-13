from django.conf import settings
from rest_framework.exceptions import ValidationError


def create_stripe_checkout_session(*, order, success_url, cancel_url):
    if not getattr(settings, 'STRIPE_SECRET_KEY', ''):
        return {
            'provider': 'mock',
            'checkout_url': None,
            'reference': order.payment_reference,
            'detail': 'Stripe is not configured; mock payment is active.',
        }

    try:
        import stripe
    except ImportError:
        raise ValidationError('Stripe package is not installed.')

    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        line_items=[
            {
                'price_data': {
                    'currency': 'uah',
                    'product_data': {
                        'name': order.listing.title,
                    },
                    'unit_amount': int(order.final_price) * 100,
                },
                'quantity': 1,
            }
        ],
        metadata={
            'order_id': str(order.id),
            'listing_id': str(order.listing_id),
            'user_id': str(order.user_id),
        },
    )
    order.payment_provider = 'stripe'
    order.payment_reference = session.id
    order.paid = False
    order.save(update_fields=['payment_provider', 'payment_reference', 'paid'])
    return {
        'provider': 'stripe',
        'checkout_url': session.url,
        'reference': session.id,
    }
