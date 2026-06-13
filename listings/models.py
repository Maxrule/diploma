from django.db import models
from django.contrib.auth import get_user_model
User = get_user_model()


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    delivery_price = models.IntegerField(default=0)

    def __str__(self):
        return self.name

class Location(models.Model):
    city = models.CharField(max_length=100)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.city

class Listing(models.Model):
    title = models.CharField(max_length=255)
    photo = models.ImageField(upload_to='listing_photos/', null=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    # Moderation / monetization fields
    reported = models.BooleanField(default=False)
    report_reason = models.TextField(blank=True)
    report_message = models.TextField(blank=True)
    reported_at = models.DateTimeField(null=True, blank=True)
    promoted_until = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

    @property
    def is_promoted(self):
        from django.utils import timezone
        return bool(self.promoted_until and self.promoted_until > timezone.now())

class Image(models.Model):
    image_url = models.TextField()
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='images')

class Review(models.Model):
    rating = models.IntegerField()
    comment = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reviews')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review by {self.user} – {self.rating}"

class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='favorited_by')

    class Meta:
        unique_together = ('user', 'listing')

