from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, parsers
from celery.result import AsyncResult
from django.core.files.storage import default_storage

from .tasks import export_courses_task, import_courses_task

class ExportCoursesAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 可从 body 里拿筛选条件
        filters = request.data if isinstance(request.data, dict) else {}
        task = export_courses_task.delay(filters)
        return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)


class ImportCoursesAPI(APIView):
    """
    上传 CSV 并启动导入任务。
    支持两种方式：
    1) multipart 上传字段 file
    2) 直接传 {"file_url": "..."}（可访问的 URL）
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def post(self, request):
        file_url = request.data.get("file_url")
        storage_path = None

        if file_url:
            # 传 URL，任务里会下载
            storage_path = file_url
        else:
            f = request.FILES.get("file")
            if not f:
                return Response({"detail":"需要上传 CSV 文件或提供 file_url"}, status=400)
            # 保存到默认存储，传递“存储路径”更稳（避免过期 URL）
            # 保存后 default_storage.save 返回相对路径，传给任务
            storage_path = default_storage.save(f"imports/courses/{f.name}", f)

        task = import_courses_task.delay(storage_path)
        return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)


class TaskStatusAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id: str):
        r = AsyncResult(task_id)
        payload = {"state": r.state}

        def absolutize(url: str) -> str:
            # /media/... -> http://127.0.0.1:8000/media/...
            return request.build_absolute_uri(url) if url and url.startswith("/") else url

        if r.state == "PROGRESS":
            meta = r.info or {}
            # 进度里如果将来含有链接，也可处理
            if isinstance(meta, dict) and "download_url" in meta:
                meta["download_url"] = absolutize(meta["download_url"])
            payload["meta"] = meta

        elif r.state == "SUCCESS":
            res = r.result or {}
            if isinstance(res, dict) and "download_url" in res:
                res["download_url"] = absolutize(res["download_url"])
            payload["result"] = res

        elif r.state == "FAILURE":
            payload["error"] = str(r.info)

        return Response(payload)