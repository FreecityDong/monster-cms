from django.contrib import admin
from .models import ClassSection

@admin.register(ClassSection)
class ClassSectionAdmin(admin.ModelAdmin):
    list_display = ("course", "section_code", "term", "teacher", "capacity", "status", "created_at")
    search_fields = ("course__code", "course__title", "section_code", "term", "teacher__username")
    list_filter = ("status", "term")