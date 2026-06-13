from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_customuser_email_verification'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('buyer', 'Buyer'),
                    ('seller', 'Seller'),
                    ('admin', 'Admin'),
                ],
                default='buyer',
                max_length=20,
            ),
        ),
    ]
