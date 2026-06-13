from datetime import datetime

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Category, Location
from .serializers import CategorySerializer, LocationSerializer
from .models import Listing
from .serializers import ListingSerializer
from .selectors import active_listings_queryset, favorite_listings_queryset, user_listings_queryset
from .services import (
    create_listing,
    promote_listing,
    replace_listing_photos,
    toggle_favorite,
    toggle_listing_active,
)


class IsListingOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user_id == request.user.id


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class CategoryRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class LocationListCreateView(generics.ListCreateAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer

class LocationRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


class ListingListCreateView(generics.ListCreateAPIView):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = active_listings_queryset()
        search = (self.request.query_params.get('search') or '').strip()
        category = self.request.query_params.get('category')
        location = self.request.query_params.get('location')
        max_price = self.request.query_params.get('max_price')

        if search:
            queryset = queryset.filter(title__icontains=search)
        if category:
            queryset = queryset.filter(category_id=category)
        if location:
            queryset = queryset.filter(location_id=location)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        return queryset

    def perform_create(self, serializer):
        create_listing(
            serializer=serializer,
            user=self.request.user,
            photos=self.request.FILES.getlist('photos'),
        )


class ListingRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Listing.objects.select_related('user', 'category', 'location').prefetch_related('images')
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsListingOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    @staticmethod
    def _is_true(value):
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in ('1', 'true', 'yes', 'on')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Do not use request.data.copy() for multipart payloads with files:
        # deepcopy can fail on TemporaryUploadedFile objects.
        data = {}
        for key in request.data.keys():
            if key in ('photos', 'remove_photo', 'photo'):
                continue
            values = request.data.getlist(key)
            if not values:
                continue
            data[key] = values[0] if len(values) == 1 else values

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance = serializer.instance

        remove_existing = self._is_true(request.data.get('remove_photo'))
        uploaded_photos = request.FILES.getlist('photos')
        fallback_photo = request.FILES.get('photo')
        if fallback_photo and not uploaded_photos:
            uploaded_photos = [fallback_photo]

        if remove_existing or uploaded_photos:
            replace_listing_photos(
                listing=instance,
                uploaded_photos=uploaded_photos,
                remove_existing=remove_existing,
            )

        return Response(self.get_serializer(instance).data)

class ListingDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self, pk, user):
        try:
            return Listing.objects.get(pk=pk, user=user)
        except Listing.DoesNotExist:
            return None

    def put(self, request, pk):
        listing = self.get_object(pk, request.user)
        if not listing:
            return Response({"error": "Объявление не найдено"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ListingSerializer(listing, data=request.data, partial=True)

        if serializer.is_valid():
            instance = serializer.save()

            # Обработка удаления фото
            if request.data.get("remove_photo") == "true":
                if instance.photo:
                    instance.photo.delete(save=False)
                    instance.photo = None
                    instance.save()

            return Response(ListingSerializer(instance).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ToggleActiveAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'detail': 'Оголошення не знайдено'}, status=status.HTTP_404_NOT_FOUND)

        listing = toggle_listing_active(listing=listing, user=request.user)
        return Response(ListingSerializer(listing).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_listings(request):
    # Keep a stable ordering for user's own listings so that promoting
    # an item does not change its position in the "My listings" view.
    listings = user_listings_queryset(request.user)
    serializer = ListingSerializer(listings, many=True)
    return Response(serializer.data)


class FavoriteListAPIView(generics.ListAPIView):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return favorite_listings_queryset(self.request.user)


class FavoriteToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        is_favorite = toggle_favorite(user=request.user, listing_id=pk)
        return Response({'listing': pk, 'is_favorite': is_favorite}, status=status.HTTP_200_OK)


class PromoteListingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'detail': 'Оголошення не знайдено'}, status=status.HTTP_404_NOT_FOUND)

        listing = promote_listing(listing=listing, user=request.user, period=request.data.get('period'))
        return Response(ListingSerializer(listing).data)


class AdminListingModerationListAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        listings = (
            Listing.objects
            .select_related('user')
            .order_by('-reported', '-promoted_until', '-created_at')
        )
        serializer = ListingSerializer(listings, many=True)
        return Response(serializer.data)


class AdminListingModerationDetailAPIView(APIView):
    permission_classes = [IsAdminUser]

    @staticmethod
    def _parse_bool(value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in ('1', 'true', 'yes', 'on'):
                return True
            if normalized in ('0', 'false', 'no', 'off'):
                return False
        if isinstance(value, int):
            return bool(value)
        return None

    @staticmethod
    def _parse_datetime(value):
        if value in (None, ''):
            return None
        if isinstance(value, datetime):
            dt = value
        elif isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                return 'invalid'
        else:
            return 'invalid'

        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return dt

    def patch(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'detail': 'Оголошення не знайдено'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'reported' in data:
            reported = self._parse_bool(data.get('reported'))
            if reported is None:
                return Response({'detail': 'Невірне значення reported'}, status=status.HTTP_400_BAD_REQUEST)
            listing.reported = reported
            if not reported:
                listing.report_reason = ''
                listing.report_message = ''
                listing.reported_at = None
            elif not listing.reported_at:
                listing.reported_at = timezone.now()

        if 'report_reason' in data:
            listing.report_reason = (data.get('report_reason') or '').strip()

        if 'report_message' in data:
            listing.report_message = (data.get('report_message') or '').strip()

        if 'reported_at' in data:
            parsed_reported_at = self._parse_datetime(data.get('reported_at'))
            if parsed_reported_at == 'invalid':
                return Response({'detail': 'Невірний формат reported_at (ISO datetime)'}, status=status.HTTP_400_BAD_REQUEST)
            listing.reported_at = parsed_reported_at

        if 'promoted_until' in data:
            parsed_promoted_until = self._parse_datetime(data.get('promoted_until'))
            if parsed_promoted_until == 'invalid':
                return Response({'detail': 'Невірний формат promoted_until (ISO datetime)'}, status=status.HTTP_400_BAD_REQUEST)
            listing.promoted_until = parsed_promoted_until

        listing.save()
        return Response(ListingSerializer(listing).data)


class ListingReportMessageAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            listing = Listing.objects.get(pk=pk)
        except Listing.DoesNotExist:
            return Response({'detail': 'Оголошення не знайдено'}, status=status.HTTP_404_NOT_FOUND)

        if listing.user != request.user:
            return Response({'detail': 'Недостатньо прав'}, status=status.HTTP_403_FORBIDDEN)

        if not listing.reported:
            return Response({'detail': 'Оголошення не заблоковане'}, status=status.HTTP_400_BAD_REQUEST)

        message = (request.data.get('report_message') or '').strip()
        if not message:
            return Response({'detail': 'Повідомлення не може бути порожнім'}, status=status.HTTP_400_BAD_REQUEST)

        listing.report_message = message
        listing.save(update_fields=['report_message'])
        return Response(ListingSerializer(listing).data, status=status.HTTP_200_OK)
