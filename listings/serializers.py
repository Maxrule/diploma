from rest_framework import serializers
from .models import Listing
from .models import Image
from .models import Category, Location
from django.conf import settings
from django.core.files.storage import default_storage


class ListingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    # Додаємо для логіки чату
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    photo = serializers.ImageField(use_url=True, required=False, allow_null=True)
    photos = serializers.SerializerMethodField(read_only=True)
    is_promoted = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'photo', 'photos', 'description', 'price',
            'created_at', 'category', 'location', 'name',
            'email', 'phone', 'user_id', 'user_name', 'is_active',
            # moderation / monetization
            'reported', 'report_reason', 'report_message', 'reported_at', 'promoted_until', 'is_promoted'
        ]
        read_only_fields = ['id', 'created_at']

    def get_is_promoted(self, obj):
        return obj.is_promoted

    def _build_optimized_image_url(self, raw_value):
        value = str(raw_value or '').strip()
        if not value:
            return None

        if value.startswith('http'):
            if 'res.cloudinary.com' in value and '/upload/' in value and '/upload/f_auto,q_auto/' not in value:
                return value.replace('/upload/', '/upload/f_auto,q_auto/', 1)
            return value

        if getattr(settings, 'CLOUDINARY_ENABLED', False):
            try:
                from cloudinary.utils import cloudinary_url
                optimized_url, _ = cloudinary_url(
                    value,
                    secure=True,
                    fetch_format='auto',
                    quality='auto',
                )
                return optimized_url
            except Exception:
                return None

        try:
            return default_storage.url(value)
        except Exception:
            return None

    def get_photos(self, obj):
        result = []
        if obj.photo:
            try:
                result.append(self._build_optimized_image_url(obj.photo.name))
            except Exception:
                pass

        extra = Image.objects.filter(listing=obj).values_list('image_url', flat=True)
        for image_url in extra:
            if not image_url:
                continue
            optimized = self._build_optimized_image_url(image_url)
            if optimized:
                result.append(optimized)
        return result

    def to_representation(self, instance):
        data = super().to_representation(instance)
        photo_name = getattr(getattr(instance, 'photo', None), 'name', None)
        data['photo'] = self._build_optimized_image_url(photo_name)
        data['photos'] = self.get_photos(instance)
        return data

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'



