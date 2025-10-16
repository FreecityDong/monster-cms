from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

# users/views_auth_extras.py
from rest_framework import generics, permissions
from .models import User
from .serializers import UserSerializer

from .serializers import (
    RegisterSerializer, ForgotUsernameSerializer,
    ForgotPasswordRequestSerializer, ResetPasswordSerializer
)

User = get_user_model()
token_gen = PasswordResetTokenGenerator()

# 注册
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        s = RegisterSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        s.save()
        return Response({"detail":"注册成功"}, status=201)

# 忘记账号（通过邮箱找回用户名）
class ForgotUsernameView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        s = ForgotUsernameSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"].lower()
        users = User.objects.filter(email__iexact=email)
        if not users.exists():
            # 为避免枚举邮箱，统一返回成功
            return Response({"detail":"若邮箱存在，我们已发送邮件"}, status=200)
        usernames = ", ".join(u.username for u in users)
        send_mail(
            subject="你的账号用户名",
            message=f"与此邮箱关联的用户名：{usernames}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
        return Response({"detail":"邮件已发送"}, status=200)

# 忘记密码：申请邮件
class ForgotPasswordRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        s = ForgotPasswordRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"].lower()
        user = User.objects.filter(email__iexact=email).first()
        # 不泄露存在与否
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_gen.make_token(user)
            # 前端的重置页面：/reset-password?uid=...&token=...
            link = f"{settings.SITE_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject="重置你的密码",
                message=f"点击链接重置密码（30分钟内有效）：{link}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        return Response({"detail":"若邮箱存在，我们已发送重置邮件"}, status=200)

# 真正重置密码
class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        s = ResetPasswordSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        uid = s.validated_data["uid"]
        token = s.validated_data["token"]
        new_password = s.validated_data["new_password"]
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response({"detail":"链接无效"}, status=400)
        if not token_gen.check_token(user, token):
            return Response({"detail":"令牌无效或已过期"}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({"detail":"密码已重置"}, status=200)
    


class TeacherListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(role="teacher").order_by("username")