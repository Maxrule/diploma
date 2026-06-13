from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Order
from .payments import create_stripe_checkout_session
from .serializers import OrderSerializer
from .services import cancel_order, create_mock_paid_order


class MyOrdersListView(generics.ListAPIView):
    """
    Возвращает список всех заказов текущего пользователя.
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Отбираем только заказы текущего пользователя
        return Order.objects.filter(user=self.request.user).order_by('-created_at')


class OrderViewSet(ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related('listing', 'listing__user', 'listing__category', 'listing__location')

    def perform_create(self, serializer):
        return create_mock_paid_order(serializer=serializer, user=self.request.user)

    def perform_destroy(self, instance):
        cancel_order(order=instance)


class StripeCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.select_related('listing').get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Замовлення не знайдено'}, status=status.HTTP_404_NOT_FOUND)

        success_url = request.data.get('success_url') or request.build_absolute_uri('/myorder.html')
        cancel_url = request.data.get('cancel_url') or request.build_absolute_uri('/myorder.html')
        payload = create_stripe_checkout_session(
            order=order,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return Response(payload, status=status.HTTP_200_OK)
