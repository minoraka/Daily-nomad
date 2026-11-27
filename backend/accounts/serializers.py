from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import Group, User


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class AuthorSerializer(serializers.ModelSerializer):
    initials = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "initials"]


class MeSerializer(serializers.ModelSerializer):
    initials = serializers.CharField(read_only=True)
    group = GroupSerializer(read_only=True)
    streak = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "initials", "role", "group", "streak"]

    def get_streak(self, obj):
        from dailies.streak import streak_for
        return streak_for(obj) if obj.is_student else None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    group = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all(), required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["username", "password", "first_name", "last_name", "role", "group"]
        extra_kwargs = {"first_name": {"required": True, "allow_blank": False},
                        "last_name": {"required": True, "allow_blank": False},
                        "role": {"required": True}}

    def validate(self, attrs):
        role, group = attrs.get("role"), attrs.get("group")
        if role == User.Role.STUDENT and group is None:
            raise serializers.ValidationError({"group": _("Students must choose a group.")})
        if role == User.Role.TEACHER and group is not None:
            raise serializers.ValidationError({"group": _("Teachers do not belong to a group.")})
        try:
            validate_password(attrs["password"], User(username=attrs.get("username"),
                                                      first_name=attrs.get("first_name", ""),
                                                      last_name=attrs.get("last_name", "")))
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
