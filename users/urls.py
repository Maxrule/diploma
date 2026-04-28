# users/urls.py
from django.urls import path
from .views import (
    RegisterView,
    VerifyEmailCodeView,
    ResendVerificationCodeView,
    UserDetailView,
    MyTokenObtainPairView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailCodeView.as_view(), name='verify-email'),
    path('resend-code/', ResendVerificationCodeView.as_view(), name='resend-code'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
]
