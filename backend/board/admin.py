from django.contrib import admin

from .models import Comment, Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "created_by", "status", "priority", "deadline", "updated_at")
    list_filter = ("status", "priority", "owner__group")
    search_fields = ("title",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("task", "author", "created_at")
