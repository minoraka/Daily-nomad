from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Daily(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dailies")
    date = models.DateField()
    done = models.TextField(_("done"))
    plans = models.TextField(_("plans"), blank=True)
    blockers = models.TextField(_("blockers"), blank=True)
    tasks = models.ManyToManyField("board.Task", blank=True, related_name="dailies")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [models.UniqueConstraint(fields=["author", "date"], name="one_daily_per_day")]

    def __str__(self):
        return f"{self.author} {self.date}"
