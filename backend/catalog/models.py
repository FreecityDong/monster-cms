from django.db import models

class Course(models.Model):
    code = models.CharField(max_length=32, unique=True)  # 课程代码，如 CS101
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    credits = models.DecimalField(max_digits=3, decimal_places=1, default=0)  # 学分，可选
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.title}"
    

# 追加在文件末尾（保留已有 Course 等模型）
from django.conf import settings
from django.db import models

def course_attachment_upload_to(instance, filename):
    # 存到 S3/MinIO 中的路径，比如：courses/CS101/attachments/<filename>
    course_code = (instance.course.code or "unknown").replace("/", "_")
    return f"courses/{course_code}/attachments/{filename}"

class CourseAttachment(models.Model):
    course = models.ForeignKey("catalog.Course", on_delete=models.CASCADE, related_name="attachments")
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to=course_attachment_upload_to)
    content_type = models.CharField(max_length=128, blank=True)
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="uploaded_course_files")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.course.code} - {self.title or self.file.name}"