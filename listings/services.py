from datetime import timedelta

from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Favorite, Image, Listing


PROMOTION_PERIODS = {
    '3d': timedelta(days=3),
    '1w': timedelta(weeks=1),
    '1m': timedelta(days=30),
}


def create_listing(*, serializer, user, photos):
    photos = list(photos or [])
    if photos:
        listing = serializer.save(user=user, photo=photos[0])
        for extra in photos[1:]:
            saved_path = default_storage.save(f'listing_photos/{extra.name}', extra)
            Image.objects.create(listing=listing, image_url=saved_path)
        return listing
    return serializer.save(user=user)


def replace_listing_photos(*, listing, uploaded_photos, remove_existing):
    uploaded_photos = list(uploaded_photos or [])
    if not remove_existing and not uploaded_photos:
        return listing

    def safe_delete_file(raw_path):
        path = str(raw_path or '').strip()
        if not path or path.startswith('http'):
            return
        default_storage.delete(path.lstrip('/'))

    with transaction.atomic():
        if listing.photo:
            listing.photo.delete(save=False)
            listing.photo = None

        old_extra_images = list(listing.images.all())
        for extra in old_extra_images:
            safe_delete_file(extra.image_url)
            extra.delete()

        if uploaded_photos:
            listing.photo = uploaded_photos[0]
            listing.save(update_fields=['photo'])
            for extra in uploaded_photos[1:]:
                file_name = str(getattr(extra, 'name', 'photo'))
                saved_path = default_storage.save(f'listing_photos/{file_name}', extra)
                Image.objects.create(listing=listing, image_url=saved_path)
        else:
            listing.save(update_fields=['photo'])
    return listing


def toggle_listing_active(*, listing, user):
    if listing.user_id != user.id:
        raise PermissionDenied('Недостатньо прав')
    listing.is_active = not listing.is_active
    listing.save(update_fields=['is_active'])
    return listing


def promote_listing(*, listing, user, period):
    if listing.user_id != user.id:
        raise PermissionDenied('Недостатньо прав')

    delta = PROMOTION_PERIODS.get(period)
    if delta is None:
        raise ValidationError({'detail': 'Невірний період'})

    listing.promoted_until = timezone.now() + delta
    listing.save(update_fields=['promoted_until'])
    return listing


def toggle_favorite(*, user, listing_id):
    try:
        listing = Listing.objects.get(pk=listing_id, is_active=True, reported=False)
    except Listing.DoesNotExist:
        raise ValidationError({'detail': 'Оголошення не знайдено'})

    favorite, created = Favorite.objects.get_or_create(user=user, listing=listing)
    if not created:
        favorite.delete()
    return created
