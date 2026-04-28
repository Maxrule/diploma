from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count
from django.db.models import Sum, F
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from django.contrib.auth import get_user_model
from listings.models import Listing
from users.models import Visit
from orders.models import Order, CanceledOrderLog

User = get_user_model()


class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get_date_range(self, request):
        """Determine start and end dates based on query params.
        Supports:
        - ?period=<days>  (int days)
        - ?from=YYYY-MM-DD&to=YYYY-MM-DD  (custom range)
        Defaults to last 7 days.
        Returns (start_date (date), end_date (date)) inclusive.
        """
        period = request.query_params.get('period')
        from_str = request.query_params.get('from')
        to_str = request.query_params.get('to')

        today = timezone.localdate()

        if period and period.isdigit():
            days = int(period)
            # period=1 => only today
            start = today - timedelta(days=days - 1)
            end = today
            return start, end

        if from_str and to_str:
            try:
                start = datetime.strptime(from_str, '%Y-%m-%d').date()
                end = datetime.strptime(to_str, '%Y-%m-%d').date()
                if end < start:
                    start, end = end, start
                return start, end
            except Exception:
                pass

        # default: last 7 days
        return today - timedelta(days=6), today

    def get(self, request, format=None):
        start_date, end_date = self.get_date_range(request)

        # Build list of labels (YYYY-MM-DD) covering the inclusive range
        days = (end_date - start_date).days + 1
        labels = [(start_date + timedelta(days=i)).isoformat() for i in range(days)]

        # REGISTRATIONS per day
        users_qs = User.objects.filter(date_joined__date__gte=start_date, date_joined__date__lte=end_date)
        regs_by_day = users_qs.annotate(day=TruncDate('date_joined')).values('day').annotate(count=Count('id')).order_by('day')
        regs_map = {r['day'].isoformat(): r['count'] for r in regs_by_day}
        registrations = [regs_map.get(d, 0) for d in labels]

        # LISTINGS per day
        listings_qs = Listing.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        lists_by_day = listings_qs.annotate(day=TruncDate('created_at')).values('day').annotate(count=Count('id')).order_by('day')
        lists_map = {r['day'].isoformat(): r['count'] for r in lists_by_day}
        listings_data = [lists_map.get(d, 0) for d in labels]

        # Totals
        total_users = User.objects.count()
        new_users = sum(registrations)
        total_listings = Listing.objects.count()
        # Active/inactive should reflect the `is_active` flag
        active_listings = Listing.objects.filter(is_active=True).count()
        inactive_listings = Listing.objects.filter(is_active=False).count()

        # Visits: no persistent tracking model in project -> return zeros (front-end can adapt)
        # If you have analytics, replace calculations here.
        # Use Visit model to compute visits per day (more accurate than last_login)
        visits_qs = Visit.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        visits_by_day = visits_qs.annotate(day=TruncDate('created_at')).values('day').annotate(count=Count('id')).order_by('day')
        visits_map = {r['day'].isoformat(): r['count'] for r in visits_by_day}
        visits = [visits_map.get(d, 0) for d in labels]
        visits_day = visits_map.get(end_date.isoformat(), 0)
        visits_week = sum(visits[-7:]) if len(visits) >= 7 else sum(visits)
        visits_month = sum(visits[-30:]) if len(visits) >= 30 else sum(visits)

        # Growth metrics: compare current period vs previous same-length period
        prev_start = start_date - timedelta(days=days)
        prev_end = start_date - timedelta(days=1)
        prev_regs = User.objects.filter(date_joined__date__gte=prev_start, date_joined__date__lte=prev_end).count()
        prev_lists = Listing.objects.filter(created_at__date__gte=prev_start, created_at__date__lte=prev_end).count()

        def pct_change(curr, prev):
            if prev == 0:
                return 100.0 if curr > 0 else 0.0
            return round((curr - prev) / prev * 100.0, 1)

        growth_registrations = pct_change(new_users, prev_regs)
        growth_listings = pct_change(active_listings, prev_lists)

        data = {
            'total_users': total_users,
            'new_users': new_users,
            'total_listings': total_listings,
            'active_listings': active_listings,
            'inactive_listings': inactive_listings,
            'visits_day': visits_day,
            'visits_week': visits_week,
            'visits_month': visits_month,
            'labels': labels,
            'visits': visits,
            'growth_registrations': growth_registrations,
            'growth_listings': growth_listings,
            'registrations': registrations,
            'listings': listings_data,
        }

        # ORDERS: aggregate by listing for the selected period
        orders_qs = Order.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        orders_by_listing = orders_qs.values('listing_id', 'listing__title', 'listing__price').annotate(
            quantity=Count('id'),
            delivery_sum=Sum('delivery_price'),
            total_sum=Sum('final_price')
        ).order_by('-quantity')

        orders_list = []
        orders_total_count = 0
        orders_total_revenue = 0
        orders_total_delivery = 0
        orders_total_unit_sum = 0.0
        for o in orders_by_listing:
            orders_total_count += o['quantity']
            orders_total_revenue += (o['total_sum'] or 0)
            orders_total_delivery += (o['delivery_sum'] or 0)
            unit_price = float(o.get('listing__price') or 0)
            orders_total_unit_sum += unit_price * o['quantity']
            orders_list.append({
                'listing_id': o['listing_id'],
                'title': o.get('listing__title') or '',
                'unit_price': unit_price,
                'quantity': o['quantity'],
                'delivery_sum': float(o.get('delivery_sum') or 0),
                'total_sum': float(o.get('total_sum') or 0),
            })

        data['orders'] = orders_list
        data['orders_total_count'] = orders_total_count
        data['orders_total_revenue'] = orders_total_revenue
        data['orders_total_delivery'] = orders_total_delivery
        data['orders_total_unit_sum'] = orders_total_unit_sum

        canceled_orders_count = CanceledOrderLog.objects.filter(
            canceled_at__date__gte=start_date,
            canceled_at__date__lte=end_date
        ).count()
        data['orders_canceled_count'] = canceled_orders_count
        data['orders_with_canceled_count'] = orders_total_count + canceled_orders_count

        return Response(data, status=status.HTTP_200_OK)
