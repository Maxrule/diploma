from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from http.cookies import SimpleCookie

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    try:
        access_token = AccessToken(token)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        token = None

        for header_name, header_value in scope.get('headers', []):
            if header_name == b'authorization':
                value = header_value.decode()
                if value.lower().startswith('bearer '):
                    token = value.split(' ', 1)[1].strip()
                    break
            if header_name == b'cookie':
                cookies = SimpleCookie()
                cookies.load(header_value.decode())
                morsel = cookies.get('access_token')
                if morsel:
                    token = morsel.value
                    break

        if not token:
            for subprotocol in scope.get('subprotocols', []):
                if subprotocol.startswith('jwt.'):
                    token = subprotocol[4:]
                    break

        if not token:
            scope['user'] = AnonymousUser()
        else:
            scope['user'] = await get_user_from_token(token)

        return await self.inner(scope, receive, send)
