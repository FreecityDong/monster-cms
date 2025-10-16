from rest_framework.permissions import BasePermission, SAFE_METHODS

class CoursePermission(BasePermission):
    """
    课程：manager/registrar 可写；其余只读
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        role = getattr(getattr(request, "user", None), "role", None)
        return role in ("manager", "registrar")

class CourseAttachmentPermission(BasePermission):
    """
    课程附件：manager/registrar 可写；其余只读
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        role = getattr(getattr(request, "user", None), "role", None)
        return role in ("manager", "registrar")