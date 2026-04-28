from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0008_listing_promoted_until_listing_report_reason_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='listing',
            name='report_message',
            field=models.TextField(blank=True),
        ),
    ]

