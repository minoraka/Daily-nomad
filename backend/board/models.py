from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", _("Planned")
        IN_PROGRESS = "in_progress", _("In progress")
        REVIEW = "review", _("In review")
        DONE = "done", _("Done")

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    ESTIMATES = (1, 2, 3, 5, 8)

    # owner = assignee: whose board the card is on.
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_tasks")
    title = models.CharField(_("title"), max_length=200)
    description = models.TextField(_("description"), blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    position = models.PositiveIntegerField(default=0)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    estimate = models.PositiveSmallIntegerField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    labels = models.JSONField(default=list, blank=True)
    batch = models.UUIDField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "owner__last_name", "owner__first_name", "position", "id"]

    def __str__(self):
        return f"{self.key} {self.title}"

    @property
    def key(self):
        return f"SB-{self.id}"

    @property
    def from_teacher(self):
        return self.created_by.role == "teacher"


class Comment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    text = models.TextField(_("text"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.author} → {self.task.key}"
