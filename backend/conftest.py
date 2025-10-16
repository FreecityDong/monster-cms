# conftest.py
import pytest
from rest_framework.test import APIClient
from users.models import User

@pytest.fixture
def api():
    return APIClient()

@pytest.fixture
def users(db):
    """
    一次性创建 4 个测试用户：manager / registrar / teacher / student
    默认密码 123456.Aa!
    """
    def mk(u, role):
        x, _ = User.objects.get_or_create(username=u, defaults={"role": role, "email": f"{u}@local"})
        x.set_password("123456.Aa!")
        x.role = role
        x.save()
        return x
    return {
        "m": mk("m1", "manager"),
        "r": mk("r1", "registrar"),
        "t": mk("t1", "teacher"),
        "s": mk("s1", "student"),
    }

def login(api: APIClient, username: str, password: str = "123456.Aa!"):
    """通过 /auth/login 拿 JWT，并把 Authorization 头塞进 APIClient。"""
    res = api.post("/auth/login", {"username": username, "password": password}, format="json")
    assert res.status_code == 200, f"login failed for {username}: {res.status_code} {res.content}"
    token = res.data["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api