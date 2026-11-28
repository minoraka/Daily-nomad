import django_filters
from django.db.models import Max
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsOwnerOrReadOnly, StudentCanCreate

from .models import Task
from .serializers import MoveSerializer, TaskCreateSerializer, TaskSerializer
from .services import move_task


class TaskFilter(django_filters.FilterSet):
    group = django_filters.NumberFilter(field_name="owner__group_id")
    owner = django_filters.NumberFilter(field_name="owner_id")

    class Meta:
        model = Task
        fields = ["group", "owner", "status"]


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related("owner", "created_by")
    filterset_class = TaskFilter
    permission_classes = [permissions.IsAuthenticated, StudentCanCreate, IsOwnerOrReadOnly]
    pagination_class = None

    def get_serializer_class(self):
        return TaskCreateSerializer if self.action == "create" else TaskSerializer

    def perform_create(self, serializer):
        last = Task.objects.filter(owner=self.request.user, status=Task.Status.TODO).aggregate(m=Max("position"))["m"]
        serializer.save(owner=self.request.user, created_by=self.request.user, status=Task.Status.TODO, position=0 if last is None else last + 1)

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
