from django.contrib import admin

from .models import Daily


@admin.register(Daily)
class DailyAdmin(admin.ModelAdmin):
    list_display = ("author", "date", "created_at")
    list_filter = ("date", "author__group")
