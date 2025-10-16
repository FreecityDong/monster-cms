from django.db import models
from django.conf import settings
from catalog.models import Course

class ClassSection(models.Model):
    STATUS = [
        ("draft", "draft"),
        ("published", "published"),
        ("archived", "archived"),
    ]
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    section_code = models.CharField(max_length=32)  # 班号，如 2025-1
    term = models.CharField(max_length=64)          # 学期，如 2025 Spring
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="teaching_sections")
    capacity = models.PositiveIntegerField(default=50)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("course", "term","section_code")  # 同一课程下的班号唯一
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.course.code} [{self.section_code}] - {self.term}"