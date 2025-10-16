import csv, io
from datetime import datetime
from celery import shared_task
from django.db import transaction
from catalog.models import Course
from .utils_storage import save_bytes, read_bytes

@shared_task(bind=True)
def export_courses_task(self, filters: dict | None = None):
    """
    导出课程为 CSV，返回 {"download_url": "..."}
    """
    qs = Course.objects.all().order_by("id")
    # （可选）基于 filters 做筛选：code/title/credits 等
    if filters:
        code = filters.get("code")
        if code: qs = qs.filter(code__icontains=code)
        title = filters.get("title")
        if title: qs = qs.filter(title__icontains=title)

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "code", "title", "description", "credits", "updated_at"])
    for c in qs.iterator():
        w.writerow([c.id, c.code, c.title, (c.description or "").replace("\n"," "), str(c.credits), c.updated_at.isoformat()])

    data = buf.getvalue().encode("utf-8-sig")  # 带 BOM, 方便 Excel
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    key = f"exports/courses_{ts}.csv"

    download_url = save_bytes(key, data)
    return {"status": "success", "download_url": download_url, "count": qs.count()}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=3, max_retries=3)
def import_courses_task(self, storage_path: str):
    """
    从 storage 路径或 URL 读取 CSV 导入课程。格式：id,code,title,description,credits
    - id 可留空（新建），带 id 则尝试更新。
    返回 {"status":"success","ok":N,"fail":M}
    """
    raw = read_bytes(storage_path)
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    ok, fail = 0, 0
    for i, row in enumerate(reader, start=2):  # 从第2行开始（第1行为表头）
        try:
            code = (row.get("code") or "").strip()
            title = (row.get("title") or "").strip()
            if not code or not title:
                fail += 1
                continue
            description = (row.get("description") or "").strip()
            credits_str = (row.get("credits") or "3.0").strip()
            try:
                # DecimalField 用字符串最稳
                credits = str(float(credits_str))
            except:
                credits = "3.0"

            # 幂等策略：以 code 为自然键 upsert
            with transaction.atomic():
                obj, created = Course.objects.get_or_create(code=code, defaults={
                    "title": title, "description": description, "credits": credits
                })
                if not created:
                    obj.title = title
                    obj.description = description
                    obj.credits = credits
                    obj.save(update_fields=["title","description","credits"])
            ok += 1

            # 进度上报（可选）
            if (ok + fail) % 100 == 0:
                self.update_state(state="PROGRESS", meta={"ok": ok, "fail": fail})

        except Exception:
            fail += 1
            # 可收集错误详情，MVP先略

    return {"status":"success","ok": ok, "fail": fail}

