from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, TaskViewSet

router = DefaultRouter(trailing_slash=True)
router.register("tasks", TaskViewSet)
router.register("comments", CommentViewSet)
urlpatterns = router.urls
