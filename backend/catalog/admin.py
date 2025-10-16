from django.contrib import admin
from .models import Course

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "credits", "updated_at")
    search_fields = ("code", "title")

from django.contrib import admin
from .models import CourseAttachment

@admin.register(CourseAttachment)
class CourseAttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "title", "size", "uploaded_by", "created_at")
    list_filter = ("course",)
    search_fields = ("title", "course__code")