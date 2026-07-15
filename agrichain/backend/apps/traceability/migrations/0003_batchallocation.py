import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('distribution', '0008_alter_collectionnotice_collection_deadline'),
        ('traceability', '0002_batch_mismatch_description_batch_mismatch_notes_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='BatchAllocation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity_kg', models.DecimalField(decimal_places=2, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('batch', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='allocations', to='traceability.batch')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='batch_allocations', to='distribution.order')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
