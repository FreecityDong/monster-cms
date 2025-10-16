from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

# users/views.py（追加）
from rest_framework import status, permissions
from django.contrib.auth.password_validation import validate_password

from rest_framework import generics, permissions
from .models import User
from .serializers import UserSerializer
from rest_framework import serializers

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        u, p = request.data.get('username'), request.data.get('password')
        user = authenticate(username=u, password=p)
        if not user:
            return Response({"detail":"Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        ref = RefreshToken.for_user(user)
        return Response({"access": str(ref.access_token), "refresh": str(ref)})

class MeView(APIView):
    def get(self, request):
        u = request.user
        return Response({"id":u.id, "username":u.username, "role":u.role})
    

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old = request.data.get("old_password")
        new = request.data.get("new_password")
        user = request.user

        # 校验旧密码
        if not user.check_password(old or ""):
            return Response({"detail": "旧密码不正确"}, status=status.HTTP_400_BAD_REQUEST)

        # 运行所有密码校验器（包含我们自定义的）
        try:
            validate_password(new, user=user)
        except Exception as e:
            # 聚合多条错误
            msgs = []
            for err in (e.error_list if hasattr(e, "error_list") else [e]):
                msgs.extend(err.messages if hasattr(err, "messages") else [str(err)])
            return Response({"errors": msgs}, status=status.HTTP_400_BAD_REQUEST)

        # 通过则设置新密码
        user.set_password(new)
        user.save()
        return Response({"detail": "密码已更新"})
    


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]
    
