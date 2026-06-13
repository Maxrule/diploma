from django.urls import path
from .views import chat_info_api, get_my_chats  # Перевірте ці назви!

urlpatterns = [
    # Ендпоінт для конкретного чату (історія)
    path('api/chat-info/<int:listing_id>/<str:user_id>/', chat_info_api, name='chat_info_api'),

    # Ендпоінт для списку всіх чатів (бокова панель)
    path('api/my-chats/', get_my_chats, name='get_my_chats'),
]