from rest_framework.routers import DefaultRouter

from .views import TaskViewSet

router = DefaultRouter(trailing_slash=True)
router.register("tasks", TaskViewSet)
urlpatterns = router.urls
