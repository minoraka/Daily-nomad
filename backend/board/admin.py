from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "status", "position", "updated_at")
    list_filter = ("status", "owner__group")
    search_fields = ("title",)
