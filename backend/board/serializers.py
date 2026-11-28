from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from accounts.serializers import AuthorSerializer

from .models import Comment, Task

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


class AssignSerializer(TaskSerializer):
    """Teacher creates one copy of the task per student: either explicit `assignees` or a whole `group`."""
    assignees = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    group = serializers.IntegerField(required=False, write_only=True)

    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ["assignees", "group"]
        read_only_fields = ["position", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        from accounts.models import Group, User

        has_list, has_group = "assignees" in attrs, "group" in attrs
        if has_list == has_group:
            raise serializers.ValidationError(_("Choose either assignees or group."))
        if has_group:
            if not Group.objects.filter(pk=attrs["group"]).exists():
                raise serializers.ValidationError({"group": [_("Unknown group.")]})
            students = list(User.objects.filter(group_id=attrs["group"], role=User.Role.STUDENT))
            if not students:
                raise serializers.ValidationError({"group": [_("No students in this group.")]})
        else:
            ids = set(attrs["assignees"])
            students = list(User.objects.filter(pk__in=ids, role=User.Role.STUDENT))
            if not ids or len(students) != len(ids):
                raise serializers.ValidationError({"assignees": [_("Only students can be assignees.")]})
        attrs.pop("assignees", None)
        attrs.pop("group", None)
        attrs["students"] = students
        return attrs


class CommentSerializer(serializers.ModelSerializer):
    author = UserRefSerializer(read_only=True)
    text = serializers.CharField(max_length=2000, trim_whitespace=True)
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "task", "author", "text", "created_at", "can_delete"]
        read_only_fields = ["task", "created_at"]

    def get_can_delete(self, obj):
        request = self.context.get("request")
        return bool(request and obj.author_id == request.user.id)
