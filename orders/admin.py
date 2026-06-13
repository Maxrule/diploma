from django.contrib import admin
from .models import Order, CanceledOrderLog


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'listing', 'final_price', 'paid', 'payment_provider', 'created_at')
    list_filter = ('paid', 'city', 'payment_provider')
    search_fields = ('id', 'payment_reference', 'user__username', 'listing__title')


@admin.register(CanceledOrderLog)
class CanceledOrderLogAdmin(admin.ModelAdmin):
    list_display = ('original_order_id', 'user', 'listing', 'final_price', 'canceled_at')
    list_filter = ('paid', 'city', 'canceled_at')
    search_fields = ('original_order_id',)
