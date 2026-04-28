from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MyOrdersListView, OrderViewSet, OrderCreateView

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='orders')

urlpatterns = [
    path('', OrderCreateView.as_view(), name='order-create'),  # POST для создания
    path('myorders/', MyOrdersListView.as_view(), name='my-orders'),# GET для списка
    path('', include(router.urls)),
]
