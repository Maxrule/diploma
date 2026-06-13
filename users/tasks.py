from django.utils import timezone

try:
    from celery import shared_task
except ImportError:
    def shared_task(func=None, **_kwargs):
        if func is None:
            return lambda wrapped: wrapped
        return func

from .models import CustomUser


@shared_task
def cleanup_expired_verification_codes():
    return CustomUser.objects.filter(
        email_verified=False,
        verification_code_expires_at__lt=timezone.now(),
    ).update(
        verification_code='',
        verification_code_expires_at=None,
    )
