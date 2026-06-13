import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'classifieds_project.settings')

try:
    from celery import Celery
except ImportError:
    Celery = None


if Celery is not None:
    app = Celery('classifieds_project')
    app.config_from_object('django.conf:settings', namespace='CELERY')
    app.autodiscover_tasks()
else:
    app = None
