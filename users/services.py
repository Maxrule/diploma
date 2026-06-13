from datetime import timedelta
import random

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

from .models import CustomUser

CODE_TTL_MINUTES = 10


def generate_verification_code():
    return f'{random.randint(0, 999999):06d}'


def send_verification_email(email, code):
    send_mail(
        subject='Код підтвердження email',
        message=(
            'Ваш код підтвердження: '
            f'{code}\n\n'
            f'Код дійсний {CODE_TTL_MINUTES} хвилин.'
        ),
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
        recipient_list=[email],
        fail_silently=False,
    )


def issue_verification_code(user):
    code = generate_verification_code()
    user.verification_code = code
    user.verification_code_expires_at = timezone.now() + timedelta(minutes=CODE_TTL_MINUTES)
    user.save(update_fields=['verification_code', 'verification_code_expires_at'])
    send_verification_email(user.email, code)
    return user
