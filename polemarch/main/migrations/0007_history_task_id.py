# -*- coding: utf-8 -*-
# Generated by Django 1.11.3 on 2017-07-17 01:47
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0006_auto_20170711_1546'),
    ]

    operations = [
        migrations.AddField(
            model_name='history',
            name='task_id',
            field=models.CharField(blank=True, default=None, max_length=50, null=True),
        ),
    ]
