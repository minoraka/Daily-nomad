from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    owner_field = "owner"

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(obj, getattr(view, "owner_field", self.owner_field) + "_id") == request.user.id


class StudentCanCreate(permissions.BasePermission):
    """Only students may create objects (tasks, dailies)."""

    def has_permission(self, request, view):
        if view.action == "create":
            return request.user.is_authenticated and request.user.is_student
        return True
