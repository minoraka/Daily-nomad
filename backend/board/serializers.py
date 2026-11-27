from rest_framework import serializers

from accounts.serializers import AuthorSerializer

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    owner = AuthorSerializer(read_only=True)

    class Meta:
        model = Task
        fields = ["id", "owner", "title", "description", "status", "position", "created_at", "updated_at"]
        read_only_fields = ["position", "created_at", "updated_at"]


class TaskCreateSerializer(TaskSerializer):
    class Meta(TaskSerializer.Meta):
        read_only_fields = ["position", "status", "created_at", "updated_at"]


class MoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.Status.choices)
    position = serializers.IntegerField(min_value=0)
