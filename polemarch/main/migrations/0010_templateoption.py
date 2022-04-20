# Generated by Django 3.2.8 on 2021-11-30 06:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0009_auto_20200622_0618'),
    ]

    operations = [
        migrations.CreateModel(
            name='TemplateOption',
            fields=[
                ('name', models.CharField(max_length=256, primary_key=True, serialize=False)),
                ('data', models.JSONField(default=dict)),
            ],
            options={
                'managed': False,
            },
        ),
    ]