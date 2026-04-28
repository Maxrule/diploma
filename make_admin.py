import os
import django

# 1. Вказуємо Django, який проект використовувати
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'classifieds_project.settings')

# 2. Ініціалізуємо Django
django.setup()

# 3. Імпортуємо користувача
from django.contrib.auth import get_user_model
User = get_user_model()

# 4. Отримуємо користувача admin або створюємо його
username = 'admin'
password = 'admin'
email = 'admin@example.com'

try:
    u = User.objects.get(username=username)
    print(f"Користувач '{username}' існує, оновлюємо права.")
except User.DoesNotExist:
    u = User.objects.create_user(username=username, email=email, password=password)
    print(f"Користувач '{username}' створений.")

# 5. Додаємо права суперюзера
u.is_superuser = True
u.is_staff = True
u.save()

print(f"Користувач '{username}' тепер суперадмін ✅")
