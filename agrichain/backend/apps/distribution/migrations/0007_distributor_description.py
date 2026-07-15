from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('distribution', '0006_producerequest_delivery_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='distributor',
            name='description',
            field=models.TextField(blank=True, help_text='What this distributor deals in — shown to cooperatives and market agents browsing.'),
        ),
    ]
