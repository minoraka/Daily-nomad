from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.serializers import AuthorSerializer

from .models import Task

MAX_LABELS = 5
MAX_LABEL_LEN = 24


def normalize_labels(value) -> list[str]:
    """Trim, drop empties, de-duplicate case-insensitively (first spelling wins), enforce limits."""
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise serializers.ValidationError(_("Labels must be a list of strings."))
    out, seen = [], set()
    for raw in value:
        label = raw.strip()
        if not label or label.lower() in seen:
            continue
        if len(label) > MAX_LABEL_LEN:
            raise serializers.ValidationError(_("Label is too long (max 24)."))
        seen.add(label.lower())
        out.append(label)
    if len(out) > MAX_LABELS:
        raise serializers.ValidationError(_("At most 5 labels."))
    return out


class UserRefSerializer(AuthorSerializer):
    class Meta(AuthorSerializer.Meta):
        fields = AuthorSerializer.Meta.fields + ["role"]


class TaskSerializer(serializers.ModelSerializer):
    owner = AuthorSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)
    key = serializers.CharField(read_only=True)
    from_teacher = serializers.BooleanField(read_only=True)
    labels = serializers.JSONField(required=False)
    is_overdue = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ["id", "key", "owner", "created_by", "from_teacher", "title", "description", "status", "position",
                  "priority", "estimate", "deadline", "labels", "is_overdue", "comments_count",
                  "created_at", "updated_at"]
        read_only_fields = ["position", "created_at", "updated_at"]

    def validate_labels(self, value):
        return normalize_labels(value)

    def validate_estimate(self, value):
        if value is not None and value not in Task.ESTIMATES:
            raise serializers.ValidationError(_("Allowed estimates: 1, 2, 3, 5, 8."))
        return value

    def get_is_overdue(self, obj):
        return bool(obj.deadline and obj.status != Task.Status.DONE and obj.deadline < timezone.localdate())

    def get_comments_count(self, obj):
        return getattr(obj, "comments_count", 0)


class TaskCreateSerializer(TaskSerializer):
    class Meta(TaskSerializer.Meta):
        read_only_fields = ["position", "status", "created_at", "updated_at"]


class MoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.Status.choices)
    position = serializers.IntegerField(min_value=0)
