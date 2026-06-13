from django.urls import re_path
from . import Consumers

websocket_urlpatterns = [
    # Маршрут з ID товару та ID співрозмовника
    re_path(r'ws/chat/(?P<listing_id>\d+)/(?P<user_id>\d+)/$', Consumers.ChatConsumer.as_asgi()),
]