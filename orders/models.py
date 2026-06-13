from django.db import models
from django.contrib.auth import get_user_model
from listings.models import Listing

User = get_user_model()

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='orders')
    city = models.CharField(max_length=100)
    delivery_price = models.PositiveIntegerField(default=0)
    final_price = models.PositiveIntegerField(default=0)
    payment_provider = models.CharField(max_length=50, default='mock')
    payment_reference = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Order #{self.id} by {self.user.username} for {self.listing.title}"


class CanceledOrderLog(models.Model):
    original_order_id = models.PositiveIntegerField(db_index=True)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='canceled_orders'
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='canceled_orders'
    )
    city = models.CharField(max_length=100)
    delivery_price = models.PositiveIntegerField(default=0)
    final_price = models.PositiveIntegerField(default=0)
    paid = models.BooleanField(default=False)
    order_created_at = models.DateTimeField()
    canceled_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"Canceled order #{self.original_order_id}"
