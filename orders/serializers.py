from rest_framework import serializers
from .models import Order
from listings.models import Listing
from listings.serializers import ListingSerializer 

class OrderSerializer(serializers.ModelSerializer):
    # Для POST
    listing = serializers.PrimaryKeyRelatedField(queryset=Listing.objects.all())
    # Для GET
    listing_detail = ListingSerializer(source='listing', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'user',
            'listing',
            'listing_detail',
            'city',
            'delivery_price',
            'final_price',
            'payment_provider',
            'payment_reference',
            'created_at',
            'paid'
        ]
        read_only_fields = ['id', 'user', 'payment_provider', 'payment_reference', 'created_at', 'paid']
