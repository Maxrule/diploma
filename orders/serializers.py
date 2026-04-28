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
            'card_number',
            'card_expiry',
            'card_cvc',
            'created_at',
            'paid'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'paid']