from rest_framework import serializers
from .models import ClassSection

class ClassSectionSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    teacher_username = serializers.CharField(source="teacher.username", read_only=True)

    class Meta:
        model = ClassSection
        fields = [
            "id", "course", "course_title",
            "section_code", "term", "teacher", "teacher_username",
            "capacity", "start_date", "end_date", "status", "created_at"
        ]