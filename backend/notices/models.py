from django.db import models
from django.conf import settings

class Announcement(models.Model):
    AUD_ALL_STUDENTS = "all_students"
    AUDIENCE_CHOICES = [(AUD_ALL_STUDENTS, "All Students")]

    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=32, choices=AUDIENCE_CHOICES, default=AUD_ALL_STUDENTS)

    publisher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="published_announcements")
    status = models.CharField(max_length=16, choices=[("draft","draft"),("published","published"),("withdrawn","withdrawn")], default="published")
    publish_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta: ordering = ["-created_at"]

    def __str__(self): return f"{self.title} ({self.audience})"


class Delivery(models.Model):
    """
    每个学生一条投递记录，保证“待确认”可追踪。
    """
    STATE_CHOICES = [
        ("queued","queued"),         # 已生成投递待处理
        ("delivered","delivered"),   # 前端已展示（可选）
        ("acknowledged","acknowledged"), # 学生已确认
    ]
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name="deliveries")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="deliveries")

    state = models.CharField(max_length=16, choices=STATE_CHOICES, default="queued")
    delivered_at = models.DateTimeField(null=True, blank=True)
    ack_at = models.DateTimeField(null=True, blank=True)

    last_push_at = models.DateTimeField(null=True, blank=True)  # 二次提醒/邮件用
    retry_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("announcement", "user")
        indexes = [models.Index(fields=["user", "state"]), models.Index(fields=["announcement"])]

    def __str__(self): return f"Delivery<{self.announcement_id} -> {self.user_id}>"