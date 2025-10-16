from django.urls import path
from .views import ExportCoursesAPI, ImportCoursesAPI, TaskStatusAPI

urlpatterns = [
    path("exports/courses", ExportCoursesAPI.as_view()),
    path("imports/courses", ImportCoursesAPI.as_view()),
    path("tasks/<str:task_id>", TaskStatusAPI.as_view()),
]