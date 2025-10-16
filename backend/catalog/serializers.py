from rest_framework import serializers
from .models import Course

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "code", "title", "description", "credits", "created_at", "updated_at"]

from rest_framework import serializers
from .models import CourseAttachment

class CourseAttachmentSerializer(serializers.ModelSerializer):
    course_code = serializers.ReadOnlyField(source="course.code")
    uploaded_by_username = serializers.ReadOnlyField(source="uploaded_by.username")
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseAttachment
        fields = [
            "id", "course", "course_code", "title", "file", "file_url",
            "content_type", "size", "uploaded_by", "uploaded_by_username", "created_at"
        ]
        read_only_fields = ["uploaded_by", "size", "content_type", "created_at", "file_url", "course_code", "uploaded_by_username"]

    def get_file_url(self, obj):
        try:
            return obj.file.url
        except Exception:
            return ""

    def create(self, validated_data):
        request = self.context["request"]
        f = validated_data.get("file")
        if f:
            validated_data["size"] = getattr(f, "size", 0) or 0
            validated_data["content_type"] = getattr(f, "content_type", "") or ""
        validated_data["uploaded_by"] = request.user if request and request.user.is_authenticated else None
        return super().create(validated_data)
    
    def get_file_url(self, obj):
        try:
            url = obj.file.url
        except Exception:
            return ""
        request = self.context.get("request")
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)  # 变成 http://localhost:8000/media/...
        return url