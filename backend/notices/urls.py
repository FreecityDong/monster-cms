from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnnouncementViewSet, DeliveryViewSet, UnreadCountAPI

router = DefaultRouter()
router.register(r"announcements", AnnouncementViewSet, basename="announcement")
router.register(r"deliveries", DeliveryViewSet, basename="delivery")

urlpatterns = [
    path("", include(router.urls)),
    path("unread_count", UnreadCountAPI.as_view()),
]