from django.utils import timezone
from datetime import timedelta
from . import settings
from users.models import Visit


def get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class VisitMiddleware:
    """Record Visit entries for authenticated users with a short throttle.

    This middleware creates a Visit record when an authenticated user
    makes a request, but only if their last recorded visit was more than
    `throttle_seconds` ago (default 300s) to avoid excessive DB writes.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.throttle_seconds = 300  # 5 minutes

    def __call__(self, request):
        response = self.get_response(request)

        try:
            user = getattr(request, 'user', None)
            if user and user.is_authenticated:
                now = timezone.now()
                last = user.visits.first()
                if not last or (now - last.created_at).total_seconds() > self.throttle_seconds:
                    Visit.objects.create(
                        user=user,
                        path=request.path[:255],
                        ip=get_client_ip(request)[:45],
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:1024],
                        created_at=now,
                    )
        except Exception:
            # Do not let analytics break the site
            pass

        return response
