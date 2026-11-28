from rest_framework.routers import DefaultRouter

from .views import DailyViewSet

router = DefaultRouter()
router.register("dailies", DailyViewSet)
urlpatterns = router.urls
