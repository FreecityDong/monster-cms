"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# from django.contrib import admin
# from django.urls import path
# 
# urlpatterns = [
    # path('admin/', admin.site.urls),
# ]
# 

from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from django.conf import settings
from django.conf.urls.static import static


from catalog.views import CourseViewSet,CourseAttachmentViewSet
from classes.views import ClassSectionViewSet
from users.views import LoginView, MeView, ChangePasswordView
from users.views_auth_extras import (
    RegisterView, ForgotUsernameView, ForgotPasswordRequestView, ResetPasswordView,TeacherListView
)

router = routers.DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"sections", ClassSectionViewSet, basename="section")
router.register(r'course_attachments', CourseAttachmentViewSet, basename='course-attachments')


urlpatterns = [ path('auth/login', LoginView.as_view()), 
                path('auth/me', MeView.as_view()) ,
                path('admin/', admin.site.urls),
                path("auth/change_password", ChangePasswordView.as_view()),

               # 新增：注册/找回/重置
                path("auth/register", RegisterView.as_view()),
                path("auth/forgot_username", ForgotUsernameView.as_view()),
                path("auth/forgot_password", ForgotPasswordRequestView.as_view()),
                path("auth/reset_password", ResetPasswordView.as_view()),

                # 课程/班级 API
                path("api/", include(router.urls)),

                path("auth/teachers", TeacherListView.as_view()), 
                path("api/", include("jobs.urls")),
                path("api/", include("notices.urls")),
]



if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)