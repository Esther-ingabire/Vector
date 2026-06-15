from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('distribution', '0001_initial'),
        ('market_agents', '0002_alter_marketagent_options'),
    ]

    operations = [
        migrations.AlterField(
            model_name='collectionconfirmation',
            name='order',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='collection_confirmations',
                to='distribution.order',
            ),
        ),
    ]
