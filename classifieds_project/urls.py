from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

from .views import templates  # <-- импортируем функцию
from .admin_stats import AdminStatsView

urlpatterns = [
    path('admin/', admin.site.urls),

    # 1. Сначала API-маршруты
    path('api/orders/', include('orders.urls')),
    path('api/auth/', include('users.urls')),
    path('api/listings/', include('listings.urls')),
    path('api/admin/stats', AdminStatsView.as_view()),
    path('', include('chat.urls')),

    # 2. Главная страница
    path('', TemplateView.as_view(template_name='index.html')),

    # 3. Регулярное выражение для HTML-файлов
    re_path(r'^(?P<filename>.*\.html)$', templates),
]

# Добавляем поддержку медиа при DEBUG=True
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

