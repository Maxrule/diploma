from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random
User = get_user_model()

CODE_TTL_MINUTES = 10


def generate_verification_code():
    return f"{random.randint(0, 999999):06d}"


def send_verification_email(email, code):
    send_mail(
        subject="Код підтвердження email",
        message=(
            "Ваш код підтвердження: "
            f"{code}\n\n"
            f"Код дійсний {CODE_TTL_MINUTES} хвилин."
        ),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[email],
        fail_silently=False,
    )


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def validate_email(self, value):
        value = (value or "").strip().lower()
        if not value:
            raise serializers.ValidationError("Email обов'язковий.")
        if CustomUser.objects.filter(email__iexact=value, email_verified=True).exists():
            raise serializers.ValidationError("Цей email вже підтверджений іншим користувачем.")
        return value

    def create(self, validated_data):
        username = validated_data.get('username')
        email = validated_data.get('email')
        password = validated_data.get('password')

        pending_user = CustomUser.objects.filter(email__iexact=email, email_verified=False).order_by('-id').first()

        username_qs = CustomUser.objects.filter(username=username)
        if pending_user:
            username_qs = username_qs.exclude(id=pending_user.id)
        if username_qs.exists():
            raise serializers.ValidationError({"username": "Користувач з таким ім'ям вже існує."})

        code = generate_verification_code()
        expires_at = timezone.now() + timedelta(minutes=CODE_TTL_MINUTES)

        if pending_user:
            user = pending_user
            user.username = username
        else:
            user = CustomUser(username=username, email=email, is_active=False, email_verified=False)

        user.set_password(password)
        user.verification_code = code
        user.verification_code_expires_at = expires_at
        user.is_active = False
        user.email_verified = False
        user.save()
        try:
            send_verification_email(email, code)
        except Exception:
            raise serializers.ValidationError({"email": "Не вдалося надіслати код підтвердження. Спробуйте ще раз."})
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'full_name', 'phone', 'email_verified']
        extra_kwargs = {
            'username': {'read_only': True},
            'email': {'read_only': True},
            'email_verified': {'read_only': True},
        }

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Додаємо власне поле user_id
        token['user_id'] = user.id
        return token

    def validate(self, attrs):
        username = attrs.get('username')
        user = CustomUser.objects.filter(username=username).first()
        if user and not getattr(user, 'email_verified', False):
            raise serializers.ValidationError({'detail': 'Підтвердіть email перед входом.'})
        data = super().validate(attrs)

        # Додаємо user_id у відповідь на фронтенд
        data['user_id'] = self.user.id
        return data


class VerifyEmailCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        code = attrs['code'].strip()
        users_qs = CustomUser.objects.filter(email__iexact=email).order_by('-id')
        if not users_qs.exists():
            raise serializers.ValidationError({'email': 'Користувача з таким email не знайдено.'})

        pending_qs = users_qs.filter(email_verified=False)
        if not pending_qs.exists():
            raise serializers.ValidationError({'detail': 'Email вже підтверджено.'})

        user = pending_qs.filter(verification_code=code).order_by('-verification_code_expires_at', '-id').first()
        if not user:
            raise serializers.ValidationError({'code': 'Невірний код підтвердження.'})

        if not user.verification_code_expires_at or timezone.now() > user.verification_code_expires_at:
            raise serializers.ValidationError({'code': 'Термін дії коду минув. Запросіть новий код.'})

        attrs['user'] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        user.email_verified = True
        user.is_active = True
        user.verification_code = ''
        user.verification_code_expires_at = None
        user.save(update_fields=['email_verified', 'is_active', 'verification_code', 'verification_code_expires_at'])
        return user


class ResendVerificationCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        users_qs = CustomUser.objects.filter(email__iexact=email).order_by('-id')
        if not users_qs.exists():
            raise serializers.ValidationError({'email': 'Користувача з таким email не знайдено.'})

        user = users_qs.filter(email_verified=False).first()
        if not user:
            raise serializers.ValidationError({'detail': 'Email вже підтверджено.'})

        attrs['user'] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        code = generate_verification_code()
        user.verification_code = code
        user.verification_code_expires_at = timezone.now() + timedelta(minutes=CODE_TTL_MINUTES)
        user.save(update_fields=['verification_code', 'verification_code_expires_at'])
        send_verification_email(user.email, code)
        return user
