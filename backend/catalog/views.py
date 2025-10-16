from rest_framework import viewsets, filters, permissions
from .models import Course
from .serializers import CourseSerializer
from .permissions import CoursePermission

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated, CoursePermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["code", "title"]
    ordering_fields = ["code", "title", "updated_at"]

from rest_framework import viewsets, permissions, filters, parsers
from .models import CourseAttachment
from .serializers import CourseAttachmentSerializer
from .permissions import CourseAttachmentPermission

class CourseAttachmentViewSet(viewsets.ModelViewSet):
    """
    支持：
    - GET /api/course_attachments/?course=<id>  按课程过滤
    - POST multipart/form-data 上传附件（字段：course, title, file）
    - DELETE /api/course_attachments/<id>/
    """
    serializer_class = CourseAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated, CourseAttachmentPermission]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "course__code"]
    ordering_fields = ["created_at", "size"]

    def get_queryset(self):
        qs = CourseAttachment.objects.select_related("course", "uploaded_by")
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs