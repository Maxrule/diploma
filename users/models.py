from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone

class CustomUser(AbstractUser):
    ROLE_BUYER = 'buyer'
    ROLE_SELLER = 'seller'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = (
        (ROLE_BUYER, 'Buyer'),
        (ROLE_SELLER, 'Seller'),
        (ROLE_ADMIN, 'Admin'),
    )

    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_BUYER)
    email_verified = models.BooleanField(default=False)
    verification_code = models.CharField(max_length=6, blank=True)
    verification_code_expires_at = models.DateTimeField(null=True, blank=True)

    @property
    def effective_role(self):
        if self.is_staff or self.is_superuser:
            return self.ROLE_ADMIN
        return self.role


class Visit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='visits')
    path = models.CharField(max_length=255, blank=True)
    ip = models.CharField(max_length=45, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Visit {self.user_id} @ {self.created_at.isoformat()} ({self.path})"
