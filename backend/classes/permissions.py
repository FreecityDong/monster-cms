from rest_framework.permissions import BasePermission, SAFE_METHODS

class ClassSectionPermission(BasePermission):
    """
    班级：manager/registrar 可写；teacher 仅可写自己任教的 section；其余只读
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        role = getattr(getattr(request, "user", None), "role", None)
        return role in ("manager", "registrar", "teacher")

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        role = getattr(request.user, "role", None)
        if role in ("manager", "registrar"):
            return True
        if role == "teacher":
            return obj.teacher_id == request.user.id
        return False