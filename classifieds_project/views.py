import os
from django.http import FileResponse, Http404
from django.conf import settings

def templates(request, filename='index.html'):
    base_dir = settings.BASE_DIR
    filepath = os.path.join(base_dir, 'templates', filename)

    if os.path.exists(filepath):
        return FileResponse(open(filepath, 'rb'))
    else:
        raise Http404("Файл не найден")
