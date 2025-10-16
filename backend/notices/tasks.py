from celery import shared_task
from django.utils import timezone
from django.db import transaction
from .models import Announcement, Delivery
from users.models import User

BATCH_SIZE = 1000

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=3, max_retries=3)
def fanout_all_students(self, announcement_id: int):
    """
    为全体学生创建/补全 Delivery（幂等）。
    """
    qs = User.objects.filter(role="student").values_list("id", flat=True).iterator()
    now = timezone.now()
    created = 0
    batch = []
    for uid in qs:
        batch.append(Delivery(announcement_id=announcement_id, user_id=uid, state="queued", created_at=now))
        if len(batch) >= BATCH_SIZE:
            _bulk_upsert(batch); created += len(batch); batch.clear()
    if batch:
        _bulk_upsert(batch); created += len(batch)
    return {"ok": created}

def _bulk_upsert(objs):
    # Django <5.1 无真正 upsert；这里先尝试 create，再忽略唯一冲突（MVP 可接受）。
    # 若 Django 5.1+ 可用 bulk_create(..., ignore_conflicts=True)
    from django.db import IntegrityError
    try:
        Delivery.objects.bulk_create(objs, ignore_conflicts=True)
    except IntegrityError:
        # 极端情况下退回逐条 get_or_create
        for o in objs:
            Delivery.objects.get_or_create(announcement_id=o.announcement_id, user_id=o.user_id, defaults={"state":"queued"})