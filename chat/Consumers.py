import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message, Listing, User


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.listing_id = self.scope['url_route']['kwargs']['listing_id']
        self.other_user_id = self.scope['url_route']['kwargs']['user_id']
        user = self.scope["user"]

        if user.is_anonymous:
            await self.close()
            return

        user_ids = sorted([int(user.id), int(self.other_user_id)])
        self.room_group_name = f'chat_{user_ids[0]}_{user_ids[1]}_{self.listing_id}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data['message']
        sender = self.scope["user"]

        # 1. ЗБЕРЕЖЕННЯ В БАЗУ ДАНИХ
        await self.save_message(sender.id, self.other_user_id, self.listing_id, message_text)

        # 2. ВІДПРАВКА В ГРУПУ
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_text,
                'sender_id': sender.id
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender_id': event['sender_id']
        }))

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, listing_id, content):
        sender = User.objects.get(id=sender_id)
        receiver = User.objects.get(id=receiver_id)
        listing = Listing.objects.get(id=listing_id)

        return Message.objects.create(
            sender=sender,
            receiver=receiver,
            listing=listing,
            content=content
        )