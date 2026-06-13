from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .serializers import (
    RegisterSerializer,
    VerifyEmailCodeSerializer,
    ResendVerificationCodeSerializer,
)
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveUpdateAPIView
from .serializers import UserSerializer
from rest_framework.permissions import AllowAny

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from django.conf import settings
from .serializers import MyTokenObtainPairSerializer
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class VerifyEmailCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Email успішно підтверджено.'}, status=status.HTTP_200_OK)


class ResendVerificationCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Новий код підтвердження надіслано на email.'}, status=status.HTTP_200_OK)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.get('access')
            refresh = response.data.get('refresh')
            if access:
                response.set_cookie(
                    'access_token',
                    access,
                    max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                    httponly=True,
                    secure=settings.JWT_COOKIE_SECURE,
                    samesite=settings.JWT_COOKIE_SAMESITE,
                )
            if refresh:
                response.set_cookie(
                    'refresh_token',
                    refresh,
                    max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
                    httponly=True,
                    secure=settings.JWT_COOKIE_SECURE,
                    samesite=settings.JWT_COOKIE_SAMESITE,
                )
            response.data.pop('access', None)
            response.data.pop('refresh', None)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        data['refresh'] = data.get('refresh') or request.COOKIES.get('refresh_token')
        if not data.get('refresh'):
            raise InvalidToken('Refresh token is missing.')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        response = Response({'detail': 'Token refreshed.'}, status=status.HTTP_200_OK)
        access = serializer.validated_data.get('access')
        if access:
            response.set_cookie(
                'access_token',
                access,
                max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)
        response.delete_cookie('access_token', samesite=settings.JWT_COOKIE_SAMESITE)
        response.delete_cookie('refresh_token', samesite=settings.JWT_COOKIE_SAMESITE)
        return response
