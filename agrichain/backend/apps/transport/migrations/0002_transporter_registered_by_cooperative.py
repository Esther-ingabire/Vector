from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cooperatives', '0001_initial'),
        ('transport', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transporter',
            name='registered_by_cooperative',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='registered_transporters',
                to='cooperatives.cooperative',
            ),
        ),
    ]
