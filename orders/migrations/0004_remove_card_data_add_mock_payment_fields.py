from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_canceledorderlog'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='order',
            name='card_number',
        ),
        migrations.RemoveField(
            model_name='order',
            name='card_expiry',
        ),
        migrations.RemoveField(
            model_name='order',
            name='card_cvc',
        ),
        migrations.AddField(
            model_name='order',
            name='payment_provider',
            field=models.CharField(default='mock', max_length=50),
        ),
        migrations.AddField(
            model_name='order',
            name='payment_reference',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
