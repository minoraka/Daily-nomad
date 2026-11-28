from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Group, User


@admin.register(User)
class StudentBoardUserAdmin(UserAdmin):
    list_display = ("username", "last_name", "first_name", "role", "group")
    list_filter = ("role", "group")
    fieldsets = UserAdmin.fieldsets + (("Student Board", {"fields": ("role", "group")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Student Board", {"fields": ("first_name", "last_name", "role", "group")}),)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name",)
