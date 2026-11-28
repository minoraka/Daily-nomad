from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.serializers import AuthorSerializer
from board.models import Task

from .models import Daily


class DailyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title", "status"]


class DailySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    tasks = DailyTaskSerializer(many=True, read_only=True)
    task_ids = serializers.PrimaryKeyRelatedField(
        source="tasks", many=True, write_only=True, required=False, queryset=Task.objects.all())
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Daily
        fields = ["id", "author", "date", "done", "plans", "blockers", "tasks", "task_ids", "can_edit", "created_at"]
        read_only_fields = ["date", "created_at"]

    def get_can_edit(self, obj):
        request = self.context.get("request")
        return bool(request and obj.author_id == request.user.id and obj.date == timezone.localdate())

    def validate_task_ids(self, tasks):
        user = self.context["request"].user
        if any(t.owner_id != user.id for t in tasks):
            raise serializers.ValidationError(_("Unknown or foreign task."))
        return tasks

    def validate(self, attrs):
        if self.instance is None:
            user = self.context["request"].user
            if Daily.objects.filter(author=user, date=timezone.localdate()).exists():
                raise serializers.ValidationError(_("Daily for today already exists."))
        return attrs
