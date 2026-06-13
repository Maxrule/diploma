from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import MyOrdersListView, OrderViewSet, StripeCheckoutSessionView

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='orders')

urlpatterns = [
    path('myorders/', MyOrdersListView.as_view(), name='my-orders'),
    path('<int:pk>/stripe-checkout/', StripeCheckoutSessionView.as_view(), name='stripe-checkout'),
    path('', include(router.urls)),
]
