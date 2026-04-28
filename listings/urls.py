from django.urls import path
from .views import (
    ListingListCreateView,
    ListingRetrieveUpdateDestroyAPIView,
    my_listings,
    ToggleActiveAPIView,
    CategoryListCreateView,
    CategoryRetrieveUpdateDestroyView,
    LocationListCreateView,
    LocationRetrieveUpdateDestroyView,
    PromoteListingAPIView,
    AdminListingModerationListAPIView,
    AdminListingModerationDetailAPIView,
    ListingReportMessageAPIView,
)

urlpatterns = [
    path('', ListingListCreateView.as_view(), name='listing-list-create'),
    path('<int:pk>/', ListingRetrieveUpdateDestroyAPIView.as_view(), name='listing-detail'),
    path('mine/', my_listings, name='my_listings'),
    path('toggle_active/<int:pk>/', ToggleActiveAPIView.as_view(), name='toggle-active'),

    path('categories/', CategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', CategoryRetrieveUpdateDestroyView.as_view(), name='category-detail'),

    path('locations/', LocationListCreateView.as_view(), name='location-list-create'),
    path('locations/<int:pk>/', LocationRetrieveUpdateDestroyView.as_view(), name='location-detail'),
    path('promote/<int:pk>/', PromoteListingAPIView.as_view(), name='promote-listing'),
    path('report-message/<int:pk>/', ListingReportMessageAPIView.as_view(), name='listing-report-message'),
    path('admin/moderation/', AdminListingModerationListAPIView.as_view(), name='admin-listing-moderation-list'),
    path('admin/moderation/<int:pk>/', AdminListingModerationDetailAPIView.as_view(), name='admin-listing-moderation-detail'),
]
