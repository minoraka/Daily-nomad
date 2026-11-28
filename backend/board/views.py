import uuid

import django_filters
from django.db import transaction
from django.db.models import Count, Max
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from . import policy
from .models import Comment, Task
from .serializers import AssignSerializer, CommentSerializer, MoveSerializer, TaskCreateSerializer, TaskSerializer
from .services import move_task


class TaskPermission(permissions.BasePermission):
    """Role rules from the spec's permission table; see board/policy.py."""

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if view.action == "create":
            return user.is_student
        if view.action == "assign":
            return user.role == policy.TEACHER
        return True

    def has_object_permission(self, request, view, task):
        if request.method in permissions.SAFE_METHODS or view.action == "comments":
            return True  # commenting rights are checked inside the action
        user = request.user
        if view.action == "destroy":
            return policy.can_delete(user, task)
        if view.action == "move":
            return policy.can_move(user, task, request.data.get("status", ""))
        if view.action in ("update", "partial_update"):
            keys = set(request.data.keys())
            if keys - {"status"} and not policy.can_edit_fields(user, task):
                return False
            if "status" in keys and not policy.can_move(user, task, request.data["status"]):
                return False
            return bool(keys) or policy.can_edit_fields(user, task)
        return False


def next_position(owner, status_value):
    last = Task.objects.filter(owner=owner, status=status_value).aggregate(m=Max("position"))["m"]
    return 0 if last is None else last + 1


class TaskFilter(django_filters.FilterSet):
    group = django_filters.NumberFilter(field_name="owner__group_id")
    owner = django_filters.NumberFilter(field_name="owner_id")

    class Meta:
        model = Task
        fields = ["group", "owner", "status"]


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related("owner", "created_by").annotate(comments_count=Count("comments"))
    filterset_class = TaskFilter
    permission_classes = [TaskPermission]
    pagination_class = None

    def get_serializer_class(self):
        return TaskCreateSerializer if self.action == "create" else TaskSerializer

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(owner=user, created_by=user, status=Task.Status.TODO,
                        position=next_position(user, Task.Status.TODO))

    @action(detail=False, methods=["post"])
    def assign(self, request):
        ser = AssignSerializer(data=request.data, context=self.get_serializer_context())
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        students = data.pop("students")
        batch = uuid.uuid4()
        with transaction.atomic():
            created = [
                Task.objects.create(owner=s, created_by=request.user, status=Task.Status.TODO, batch=batch,
                                    position=next_position(s, Task.Status.TODO), **data)
                for s in students
            ]
        return Response(TaskSerializer(created, many=True, context=self.get_serializer_context()).data,
                        status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        new_status = serializer.validated_data.get("status", old_status)
        if new_status != old_status:
            task = serializer.save(status=old_status)
            end = Task.objects.filter(owner=task.owner, status=new_status).count()
            move_task(task, new_status, end)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        owner, status = instance.owner_id, instance.status
        instance.delete()
        for i, t in enumerate(Task.objects.filter(owner_id=owner, status=status).order_by("position", "id")):
            if t.position != i:
                Task.objects.filter(pk=t.pk).update(position=i)

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        task = self.get_object()
        ser = MoveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        move_task(task, ser.validated_data["status"], ser.validated_data["position"])
        task.refresh_from_db()
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            qs = task.comments.select_related("author")
            return Response(CommentSerializer(qs, many=True, context=self.get_serializer_context()).data)
        if not policy.can_comment(request.user, task):
            raise PermissionDenied()
        ser = CommentSerializer(data=request.data, context=self.get_serializer_context())
        ser.is_valid(raise_exception=True)
        ser.save(task=task, author=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)


class IsCommentAuthor(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.author_id == request.user.id


class CommentViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsCommentAuthor]
