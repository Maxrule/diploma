from django.db.models import Case, IntegerField, Value, When
from django.utils import timezone

from .models import Listing


def active_listings_queryset():
    now = timezone.now()
    return (
        Listing.objects
        .filter(is_active=True, reported=False)
        .select_related('user', 'category', 'location')
        .prefetch_related('images')
        .annotate(
            promotion_rank=Case(
                When(promoted_until__gt=now, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        .order_by('-promotion_rank', '-promoted_until', '-created_at')
    )


def user_listings_queryset(user):
    return (
        Listing.objects
        .filter(user=user)
        .select_related('category', 'location')
        .prefetch_related('images')
        .order_by('-created_at')
    )


def favorite_listings_queryset(user):
    return (
        Listing.objects
        .filter(favorited_by__user=user, is_active=True, reported=False)
        .select_related('user', 'category', 'location')
        .prefetch_related('images')
        .order_by('-favorited_by__id')
    )
