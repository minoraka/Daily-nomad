from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class Group(models.Model):
    name = models.CharField(_("name"), max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", _("Student")
        TEACHER = "teacher", _("Teacher")

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    group = models.ForeignKey(Group, null=True, blank=True, on_delete=models.PROTECT, related_name="members")

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def initials(self):
        return f"{self.last_name[:1]}{self.first_name[:1]}".upper() or self.username[:2].upper()
