from rest_framework import viewsets, filters, permissions
from .models import ClassSection
from .serializers import ClassSectionSerializer
from .permissions import ClassSectionPermission

class ClassSectionViewSet(viewsets.ModelViewSet):
    serializer_class = ClassSectionSerializer
    permission_classes = [permissions.IsAuthenticated, ClassSectionPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["term", "section_code", "course__code", "course__title", "teacher__username"]
    ordering_fields = ["created_at", "term", "section_code", "capacity"]

    def get_queryset(self):
        """
        manager / registrar / teacher -> 全部班级；
        student -> 仅已发布班级；
        """
        qs = ClassSection.objects.select_related("course", "teacher")
        user = self.request.user
        role = getattr(user, "role", None)

        if role in ("manager", "registrar", "teacher"):
            return qs
        # 学生或游客，只能看到已发布班级
        return qs.filter(status="published")