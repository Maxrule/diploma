from rest_framework import generics, permissions
from .models import Order, CanceledOrderLog
from .serializers import OrderSerializer
from listings.models import Listing

class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        # задаем queryset для listing
        kwargs.setdefault('data', self.request.data)
        serializer = serializer_class(*args, **kwargs)
        serializer.fields['listing'].queryset = Listing.objects.all()
        return serializer

    def perform_create(self, serializer):
        order = serializer.save(user=self.request.user)
        # After successful order creation, hide the listing from public views
        try:
            listing = order.listing
            listing.is_active = False
            listing.save()
        except Exception:
            # avoid failing the request if saving listing visibility fails
            pass


from rest_framework import generics, permissions
from .models import Order
from .serializers import OrderSerializer

class MyOrdersListView(generics.ListAPIView):
    """
    Возвращает список всех заказов текущего пользователя.
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Отбираем только заказы текущего пользователя
        return Order.objects.filter(user=self.request.user).order_by('-created_at')


from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import Order
from .serializers import OrderSerializer


class OrderViewSet(ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        if instance.paid:
            raise PermissionDenied("Неможливо скасувати доставлене замовлення")
        CanceledOrderLog.objects.create(
            original_order_id=instance.id,
            user=instance.user,
            listing=instance.listing,
            city=instance.city,
            delivery_price=instance.delivery_price,
            final_price=instance.final_price,
            paid=instance.paid,
            order_created_at=instance.created_at
        )
        instance.delete()
