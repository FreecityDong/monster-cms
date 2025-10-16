from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models  # ✅ 加这一行

from .models import Announcement, Delivery
from .serializers import AnnouncementSerializer, DeliverySerializer, AnnouncementStatsSerializer
from .permissions import IsTeacherOrAdminCanWrite
from .tasks import fanout_all_students

class AnnouncementViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                          mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Announcement.objects.all().select_related("publisher")
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated & IsTeacherOrAdminCanWrite]

    def get_permissions(self):
        if self.action in ("list","retrieve"):
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        # 学生只能看已发布且未撤回；教师默认看自己发布；管理员看全部
        if u.role == "student":
            return qs.filter(status="published")
        elif u.role in ("teacher",):
            mine = self.request.query_params.get("mine")
            return qs.filter(publisher=u) if mine != "0" else qs
        return qs

    def perform_create(self, serializer):
        a = serializer.save()
        # 立即 fanout（异步）
        fanout_all_students.delay(a.id)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated & IsTeacherOrAdminCanWrite])
    def withdraw(self, request, pk=None):
        a = self.get_object()
        # 只有发布者/管理员允许撤回（管理员与 registrar 无限制）
        if request.user.role == "teacher" and a.publisher_id != request.user.id:
            return Response({"detail":"Forbidden"}, status=403)
        a.status = "withdrawn"; a.save(update_fields=["status","updated_at"])
        # 可以选择把未确认的 Delivery 标记成 delivered（或保留排查）
        return Response({"ok": True})

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated & IsTeacherOrAdminCanWrite])
    def stats(self, request, pk=None):
        a = self.get_object()
        total = Delivery.objects.filter(announcement=a).count()
        ack = Delivery.objects.filter(announcement=a, state="acknowledged").count()
        data = {"id": a.id, "title": a.title, "total": total, "ack_count": ack, "ack_rate": (ack/total if total else 0.0)}
        ser = AnnouncementStatsSerializer(data);  # dataclass-like
        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated & IsTeacherOrAdminCanWrite])
    def remind_unacked(self, request, pk=None):
        # MVP：这里只更新 retry_count（真实二次提醒可接 Celery 或邮件）
        a = self.get_object()
        qs = Delivery.objects.filter(announcement=a).exclude(state="acknowledged")
        updated = qs.update(retry_count=models.F("retry_count")+1, last_push_at=timezone.now())
        return Response({"reminded": updated})


class DeliveryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = DeliverySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        qs = Delivery.objects.filter(user=u).select_related("announcement","announcement__publisher")
        state = self.request.query_params.get("state")
        if state == "pending":
            qs = qs.exclude(state="acknowledged")
        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def delivered(self, request, pk=None):
        d = self.get_object()
        if d.user_id != request.user.id: return Response({"detail":"Forbidden"}, status=403)
        if d.state == "queued":
            d.state = "delivered"; d.delivered_at = timezone.now(); d.save(update_fields=["state","delivered_at"])
        return Response({"ok": True})

    @action(detail=True, methods=["post"])
    def ack(self, request, pk=None):
        d = self.get_object()
        if d.user_id != request.user.id: return Response({"detail":"Forbidden"}, status=403)
        if d.state != "acknowledged":
            d.state = "acknowledged"; d.ack_at = timezone.now(); d.save(update_fields=["state","ack_at"])
        return Response({"ok": True})

from rest_framework.views import APIView

class UnreadCountAPI(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        c = Delivery.objects.filter(user=request.user).exclude(state="acknowledged").count()
        return Response({"unread": c})