from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsTeacherOrAdminCanWrite(BasePermission):
    """
    教师/管理员可写（创建/撤回/提醒）；学生只读。
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        role = getattr(getattr(request, "user", None), "role", None)
        return role in ("teacher", "manager", "registrar")