import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import F


def backfill_created_by(apps, schema_editor):
    Task = apps.get_model("board", "Task")
    Task.objects.update(created_by=F("owner"))


class Migration(migrations.Migration):
    dependencies = [
        ("board", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="task", name="created_by",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="created_tasks", to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(backfill_created_by, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="task", name="created_by",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,
                                    related_name="created_tasks", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(model_name="task", name="priority", field=models.CharField(
            choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")],
            default="medium", max_length=10)),
        migrations.AddField(model_name="task", name="estimate", field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name="task", name="deadline", field=models.DateField(blank=True, null=True)),
        migrations.AddField(model_name="task", name="labels", field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="task", name="batch", field=models.UUIDField(blank=True, db_index=True, null=True)),
        migrations.AlterField(model_name="task", name="status", field=models.CharField(
            choices=[("todo", "Planned"), ("in_progress", "In progress"), ("review", "In review"), ("done", "Done")],
            default="todo", max_length=20)),
    ]
