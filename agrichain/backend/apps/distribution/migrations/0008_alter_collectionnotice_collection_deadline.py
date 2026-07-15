from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('distribution', '0007_distributor_description'),
    ]

    operations = [
        migrations.AlterField(
            model_name='collectionnotice',
            name='collection_deadline',
            field=models.DateTimeField(blank=True, null=True, help_text='Optional — leave blank to keep the listing open until you close it manually.'),
        ),
    ]
