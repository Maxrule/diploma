# diploma_pj/asgi.py (або ваш основний asgi.py)
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from chat.middleware import JWTAuthMiddleware  # Імпортуйте ваш новий клас
import chat.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'diploma_pj.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(  # Замініть AuthMiddlewareStack на ваш JWTAuthMiddleware
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})