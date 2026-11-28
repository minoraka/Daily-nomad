from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", _("Planned")
        IN_PROGRESS = "in_progress", _("In progress")
        DONE = "done", _("Done")

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(_("title"), max_length=200)
    description = models.TextField(_("description"), blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "owner__last_name", "owner__first_name", "position", "id"]

    def __str__(self):
        return self.title
