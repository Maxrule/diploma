from django.contrib import admin
from .models import Order, CanceledOrderLog


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'listing', 'final_price', 'paid', 'created_at')
	list_filter = ('paid', 'city')
	search_fields = ('card_number',)


@admin.register(CanceledOrderLog)
class CanceledOrderLogAdmin(admin.ModelAdmin):
	list_display = ('original_order_id', 'user', 'listing', 'final_price', 'canceled_at')
	list_filter = ('paid', 'city', 'canceled_at')
	search_fields = ('original_order_id',)
