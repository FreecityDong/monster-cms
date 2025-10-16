from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

def save_bytes(path: str, data: bytes) -> str:
    """
    把 bytes 保存到默认存储（本地/MinIO 皆可），返回可访问的 URL
    """
    # 确保不会覆盖
    final_path = default_storage.save(path, ContentFile(data))
    return default_storage.url(final_path)

def read_bytes(path_or_url: str) -> bytes:
    """
    简化：若是以 / 开头的存储路径，走 storage；若是 http(s) 则发起 GET
    """
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        import requests
        resp = requests.get(path_or_url, timeout=30)
        resp.raise_for_status()
        return resp.content
    # 假设是相对存储路径（例如导入 API 预先写到 storage 路径）
    with default_storage.open(path_or_url, "rb") as f:
        return f.read()