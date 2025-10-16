import pytest
from rest_framework.test import APIClient
from catalog.models import Course
from conftest import login  # 登录工具函数


@pytest.mark.django_db
def test_course_permissions(api: APIClient, users):
    print("\n=== 测试课程接口权限 ===")

    # manager 创建课程
    print("1️⃣ manager 创建课程 ...")
    login(api, "m1")
    r = api.post("/api/courses/", {"code": "CS101", "title": "Intro", "credits": "3.0"}, format="json")
    print("返回状态:", r.status_code)
    print("返回数据:", r.json())
    assert r.status_code == 201, r.content

    cid = r.data["id"]
    assert cid > 0
    print(f"✅ 创建成功，课程 id={cid}")

    # student 不允许创建
    print("\n2️⃣ student 尝试创建课程（应403）...")
    api2 = APIClient()
    login(api2, "s1")
    r2 = api2.post("/api/courses/", {"code": "CS102", "title": "X"}, format="json")
    print("返回状态:", r2.status_code)
    print("返回数据:", r2.json())
    assert r2.status_code == 403, r2.content

    print("✅ 权限验证通过：student 无法创建课程")


@pytest.mark.django_db
def test_section_permissions_and_unique(api: APIClient, users):
    print("\n=== 测试班级接口权限与唯一约束 ===")

    from users.models import User

    # 先造课程
    c = Course.objects.create(code="CS101", title="Intro")
    print(f"创建课程：{c}")

    # 再造另一位老师 t2
    t2 = User.objects.create_user(username="t2", password="123456.Aa!", role="teacher", email="t2@local")
    print(f"创建额外老师：{t2.username}")

    # manager 给 t2 建班
    print("\n1️⃣ manager 创建 t2 任教的班级 ...")
    login(api, "m1")
    r = api.post(
        "/api/sections/",
        {
            "course": c.id,
            "section_code": "1",
            "term": "2025 Spring",
            "teacher": t2.id,
            "capacity": 80,
            "status": "published",
        },
        format="json",
    )
    print("返回状态:", r.status_code)
    print("返回数据:", r.json())
    assert r.status_code == 201, r.content
    sid = r.data["id"]
    print(f"✅ 创建成功，班级 id={sid}")

    # t1 自己建班
    print("\n2️⃣ t1 自建一个班级 ...")
    api_t = APIClient()
    login(api_t, "t1")
    r2 = api_t.post(
        "/api/sections/",
        {
            "course": c.id,
            "section_code": "2",
            "term": "2025 Spring",
            "teacher": users["t"].id,
            "capacity": 60,
            "status": "draft",
        },
        format="json",
    )
    print("返回状态:", r2.status_code)
    print("返回数据:", r2.json())
    assert r2.status_code == 201, r2.content
    print("✅ t1 创建自己的班成功")

    # t1 不能改 t2 的班（403/404）
    print("\n3️⃣ t1 尝试修改 t2 的班级（应403或404） ...")
    r3 = api_t.patch(f"/api/sections/{sid}/", {"capacity": 100}, format="json")
    print("返回状态:", r3.status_code)
    try:
        print("返回数据:", r3.json())
    except Exception:
        print("返回内容:", r3.content)
    assert r3.status_code in (403, 404), r3.content
    print("✅ t1 无法修改非本人任教班级")

    # 唯一约束测试
    print("\n4️⃣ manager 尝试重复创建相同 course+term+section_code 的班级（应400或409） ...")
    r4 = api.post(
        "/api/sections/",
        {
            "course": c.id,
            "section_code": "1",
            "term": "2025 Spring",
            "teacher": t2.id,
            "capacity": 50,
            "status": "published",
        },
        format="json",
    )
    print("返回状态:", r4.status_code)
    try:
        print("返回数据:", r4.json())
    except Exception:
        print("返回内容:", r4.content)
    assert r4.status_code in (400, 409), r4.content
    print("✅ 唯一约束验证成功")