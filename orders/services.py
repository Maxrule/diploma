from uuid import uuid4

from django.db import transaction
from rest_framework.exceptions import ValidationError

from listings.models import Listing

from .models import CanceledOrderLog


def create_mock_paid_order(*, serializer, user):
    with transaction.atomic():
        listing = Listing.objects.select_for_update().get(pk=serializer.validated_data['listing'].pk)
        if not listing.is_active or listing.reported:
            raise ValidationError('Оголошення недоступне для замовлення')
        if listing.user_id == user.id:
            raise ValidationError('Не можна купити власне оголошення')

        order = serializer.save(
            user=user,
            listing=listing,
            paid=True,
            payment_provider='mock',
            payment_reference=f'mock_{uuid4().hex}',
        )
        listing.is_active = False
        listing.save(update_fields=['is_active'])
        return order


def cancel_order(*, order):
    with transaction.atomic():
        listing = Listing.objects.select_for_update().get(pk=order.listing_id)

        CanceledOrderLog.objects.create(
            original_order_id=order.id,
            user=order.user,
            listing=listing,
            city=order.city,
            delivery_price=order.delivery_price,
            final_price=order.final_price,
            paid=order.paid,
            order_created_at=order.created_at,
        )
        order.delete()

        if not listing.reported:
            listing.is_active = True
            listing.save(update_fields=['is_active'])
