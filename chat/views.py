from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Message, Listing, User


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_info_api(request, listing_id, user_id):
    """Отримання історії повідомлень та даних про конкретний чат"""
    try:
        listing = get_object_or_404(Listing, id=listing_id)

        # Знаходимо співрозмовника
        if str(user_id).isdigit():
            other_user = get_object_or_404(User, id=user_id)
        else:
            other_user = get_object_or_404(User, username=user_id)

        # Завантажуємо повідомлення конкретно для цього товару між цими двома людьми
        messages = Message.objects.filter(listing=listing).filter(
            (Q(sender=request.user) & Q(receiver=other_user)) |
            (Q(sender=other_user) & Q(receiver=request.user))
        ).order_by('timestamp')

        return Response({
            "current_user_id": request.user.id,
            "user_name": other_user.username,
            "other_user_real_id": other_user.id,
            "listing_title": listing.title,
            "history": [{
                "text": msg.content,
                "sender_id": msg.sender.id,
                "timestamp": msg.timestamp.strftime("%H:%M")
            } for msg in messages]
        })
    except Exception as e:
        # Виводимо помилку в консоль сервера для дебагу
        print(f"Chat Info Error: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_chats(request):
    """Список усіх діалогів для бокової панелі з фільтрацією по mode"""
    mode = request.GET.get('mode', 'buyer')
    user = request.user

    # Отримуємо всі повідомлення користувача, підтягуючи зв'язані дані (оптимізація)
    all_msgs = Message.objects.filter(
        Q(sender=user) | Q(receiver=user)
    ).select_related('listing', 'listing__user', 'sender', 'receiver').order_by('-timestamp')

    chats = []
    seen_dialogs = set()

    for m in all_msgs:
        other_user = m.receiver if m.sender == user else m.sender

        # ЛОГІКА РЕЖИМІВ:
        # Власник оголошення (m.listing.user) — це продавець.
        # Якщо режим 'buyer' (купую) — показуємо чати, де власник товару НЕ ви.
        # Якщо режим 'seller' (продаю) — показуємо чати, де власник товару ВИ.

        is_owner = (m.listing.user == user)

        if mode == 'buyer' and is_owner:
            continue
        if mode == 'seller' and not is_owner:
            continue

        # Унікальний ключ: Товар + Співрозмовник
        identifier = f"{m.listing.id}_{other_user.id}"

        if identifier not in seen_dialogs:
            chats.append({
                "listing_id": m.listing.id,
                "listing_title": m.listing.title,
                "other_user_id": other_user.id,
                "other_user_name": other_user.username,
                "last_message": m.content[:40] + "..." if len(m.content) > 40 else m.content,
                "timestamp": m.timestamp.strftime("%H:%M")
            })
            seen_dialogs.add(identifier)

    return Response(chats)