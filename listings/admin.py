from django.contrib import admin
from .models import Category, Location, Listing, Image, Review, Favorite


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
	list_display = ('name', 'delivery_price')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
	list_display = ('city', 'latitude', 'longitude')


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
	list_display = ('title', 'user', 'price', 'created_at', 'is_active', 'reported', 'is_promoted')
	list_filter = ('is_active', 'category', 'location', 'reported')
	search_fields = ('title', 'description', 'name', 'email', 'phone')
	actions = ('mark_reported', 'clear_report', 'promote_7_days', 'remove_promotion')

	def mark_reported(self, request, queryset):
		from django.utils import timezone
		queryset.update(reported=True, reported_at=timezone.now())
		self.message_user(request, f"Marked {queryset.count()} listings as reported.")
	mark_reported.short_description = "Mark selected listings as reported"

	def clear_report(self, request, queryset):
		queryset.update(reported=False, report_reason='', report_message='', reported_at=None)
		self.message_user(request, f"Cleared report flag for {queryset.count()} listings.")
	clear_report.short_description = "Clear report flag for selected listings"

	def promote_7_days(self, request, queryset):
		from django.utils import timezone
		from datetime import timedelta
		until = timezone.now() + timedelta(days=7)
		queryset.update(promoted_until=until)
		self.message_user(request, f"Promoted {queryset.count()} listings for 7 days.")
	promote_7_days.short_description = "Promote selected listings for 7 days"

	def remove_promotion(self, request, queryset):
		queryset.update(promoted_until=None)
		self.message_user(request, f"Removed promotion for {queryset.count()} listings.")
	remove_promotion.short_description = "Remove promotion for selected listings"


admin.site.register(Image)
admin.site.register(Review)
admin.site.register(Favorite)
