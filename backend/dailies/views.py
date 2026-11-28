import django_filters
from django.http import Http404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from common.permissions import IsOwnerOrReadOnly, StudentCanCreate

from .models import Daily
from .serializers import DailySerializer


class DailyPagination(PageNumberPagination):
    page_size = 20


class DailyFilter(django_filters.FilterSet):
    group = django_filters.NumberFilter(field_name="author__group_id")
    author = django_filters.NumberFilter(field_name="author_id")

    class Meta:
        model = Daily
        fields = ["group", "author", "date"]


class OnlyToday(permissions.BasePermission):
    message = _("You can only edit today's daily.")

    def has_object_permission(self, request, view, obj):
        return request.method in permissions.SAFE_METHODS or obj.date == timezone.localdate()


class DailyViewSet(viewsets.ModelViewSet):
    queryset = Daily.objects.select_related("author").prefetch_related("tasks")
    serializer_class = DailySerializer
    filterset_class = DailyFilter
    pagination_class = DailyPagination
    permission_classes = [permissions.IsAuthenticated, StudentCanCreate, IsOwnerOrReadOnly, OnlyToday]
    owner_field = "author"

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, date=timezone.localdate())

    @action(detail=False)
    def today(self, request):
        daily = self.get_queryset().filter(author=request.user, date=timezone.localdate()).first()
        if daily is None:
            raise Http404
        return Response(self.get_serializer(daily).data)
