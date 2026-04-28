from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_visit'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='customuser',
            name='verification_code',
            field=models.CharField(blank=True, max_length=6),
        ),
        migrations.AddField(
            model_name='customuser',
            name='verification_code_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

