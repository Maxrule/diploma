from django.contrib import admin
from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = ('id', 'listing', 'sender', 'receiver', 'timestamp')
	search_fields = ('content',)
