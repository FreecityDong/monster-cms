# 1. 登录鉴权闭环

| 模块     | 功能                                         |
| -------- | -------------------------------------------- |
| 用户注册 | 密码实时规则校验 + 注册成功后 3 秒跳转登录   |
| 登录     | JWT 登录，token 存储在 localStorage          |
| 用户信息 | /auth/me 获取登录用户信息（Dashboard）       |
| 修改密码 | 登录后可修改密码，带规则校验与提示           |
| 忘记账号 | 邮件发送用户名提示                           |
| 忘记密码 | 邮件重置密码链接 + 前端重置表单 + 倒计时跳转 |
| 后台管理 | Django Admin 管理用户及角色                  |
| 跨域通信 | CORS 配置（Next.js ↔ Django）                |
| 安全校验 | 后端密码复杂度验证、JWT 鉴权中间件           |

web_dev/
├── backend/
│ ├── core/settings.py ← JWT + CORS + 邮件配置
│ ├── core/urls.py ← /auth/... 路由
│ ├── users/
│ │ ├── models.py ← 自定义 User 模型
│ │ ├── validators.py ← 密码复杂度规则
│ │ ├── views.py ← LoginView, MeView, ChangePasswordView
│ │ └── views_auth_extras.py← Register / Forgot / Reset 密码
│ └── ...
└── frontend/
├── src/app/
│ ├── login/ ← 登录页
│ ├── register/ ← 注册页
│ ├── dashboard/ ← 用户主页
│ ├── forgot-username/ ← 忘记账号
│ ├── forgot-password/ ← 忘记密码
│ └── reset-password/ ← 重置密码页
└── src/components/
└── ChangePasswordForm.tsx

# 2.课程与课表管理

summary_text = """# 怪物课程管理系统 - 第二阶段开发总结（v1.1）

## 一、阶段目标

在完成用户登录、注册、权限体系（教学闭环基础）之后，第二阶段主要目标是实现教学管理核心模块：

1. **课程管理（Course）**
   - 课程信息的增删查改；
   - 附件上传与下载；
   - 课程与附件的访问权限；
2. **班级与课表管理（ClassSection）**
   - 班级的创建、修改、删除；
   - 不同角色的操作权限；
   - 支持课程-班级-教师的对应关系；
   - 支持前端班级管理界面。

---

## 二、系统功能结构

```
教学管理模块
├── 课程管理（Course）
│   ├── 课程基本信息：代码、名称、描述、学分
│   ├── 课程附件（CourseAttachment）
│   │   ├── 文件上传（S3 / MinIO 存储）
│   │   ├── 下载（支持本地 / 绝对路径兜底）
│   │   ├── 删除（带权限控制）
│   │   └── 列表与预览（按课程过滤）
│   └── 权限控制：
│       ├── manager / registrar：创建、编辑、删除课程
│       ├── teacher / student：仅查看课程与附件
│
└── 班级管理（ClassSection）
    ├── 班级基本信息：学期、班号、教师、容量、状态等
    ├── 课程与教师关联
    ├── 状态：draft / published / archived
    ├── 权限控制：
    │   ├── manager / registrar：所有班级可管理
    │   ├── teacher：仅能编辑自己任教的班级
    │   └── student：只读访问
    └── 课表展示（teacher 可见所有班级，但仅可修改自己负责的）
```

---

## 三、后端部分（Django + DRF）

### 1️⃣ 课程模型

```python
class Course(models.Model):
    code = models.CharField(max_length=32, unique=True)
    title = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    credits = models.DecimalField(max_digits=4, decimal_places=1, default=3.0)
    updated_at = models.DateTimeField(auto_now=True)
```

### 2️⃣ 附件模型

```python
class CourseAttachment(models.Model):
    course = models.ForeignKey("catalog.Course", on_delete=models.CASCADE, related_name="attachments")
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to=course_attachment_upload_to)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

📦 存储方式：

- 本地模式：`/media/courses/<code>/attachments/`
- 生产模式：MinIO / S3
- Django 通过 `django-storages` + `boto3` 统一管理。

---

### 3️⃣ 班级模型

```python
class ClassSection(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    section_code = models.CharField(max_length=32)
    term = models.CharField(max_length=64)
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    capacity = models.PositiveIntegerField(default=50)
    status = models.CharField(max_length=16, choices=[("draft","draft"),("published","published"),("archived","archived")])
```

---

### 4️⃣ 权限体系

| 模块                 | 权限逻辑                                                         |
| -------------------- | ---------------------------------------------------------------- |
| **Course**           | 仅 `manager` / `registrar` 可写                                  |
| **CourseAttachment** | 仅 `manager` / `registrar` 可上传 / 删除；其他只读               |
| **ClassSection**     | `manager` / `registrar` 可管理全部，`teacher` 仅可改自己任教的班 |

---

### 5️⃣ 接口与路由

- 课程接口 `/api/courses/`
- 班级接口 `/api/sections/`
- 附件接口 `/api/course_attachments/?course=<id>`

---

## 四、前端部分（Next.js + Tailwind）

### 1️⃣ 课程管理页 `/courses`

- 查看 / 搜索课程
- 新建 / 删除课程（仅管理员）
- 展开附件管理（上传 / 下载 / 删除）

### 2️⃣ 班级管理页 `/sections`

- 查看 / 搜索班级
- 新建 / 编辑 / 删除（权限控制）
- 仅教师可修改自己任教的班

### 3️⃣ 附件组件（CourseAttachments）

- 上传（multipart/form-data）
- 下载（前端兜底相对路径）
- 删除（权限校验）
- 上传成功提示 + 自动刷新

---

## 五、阶段成果

| 功能模块                   | 状态      | 说明                      |
| -------------------------- | --------- | ------------------------- |
| 用户注册 / 登录 / JWT 鉴权 | ✅ 已完成 | 全闭环                    |
| 密码规则验证与修改         | ✅ 已完成 | 含前端提示与后端验证      |
| 课程管理                   | ✅ 已完成 | 增删查、附件功能          |
| 课程附件上传/下载          | ✅ 已完成 | 支持本地和 MinIO          |
| 班级管理（ClassSection）   | ✅ 已完成 | 含角色权限控制            |
| 数据库迁移与测试           | ✅ 已通过 | pytest 覆盖 CRUD 权限逻辑 |

---

## 六、下一阶段规划（v1.2）

| 方向        | 内容                                   |
| ----------- | -------------------------------------- |
| 📚 教学内容 | 课件、作业、资料管理（关联课程与班级） |
| 📆 教师课表 | 教师课表自动生成与周视图展示           |
| 📈 数据统计 | 课程开设情况、选课人数统计             |
| 🔔 通知公告 | 教师发布课程公告、学生接收提醒         |
| 📨 异步任务 | 启用 Celery + Redis 实现批量导入/导出  |

---

## ✅ 小结

第二阶段已实现教学核心数据闭环，课程与班级功能均具备：

- 管理员端课程与班级的完整管理能力；
- 教师端课程资料上传能力；
- 学生端课程与附件浏览功能；

> 系统现已具备教学管理的最小可运行版本（MVP v1.1）。

# 3.功能模块：Celery + Redis 异步任务系统

📦 Celery + Redis 异步任务系统开发总结 (v1.2)

## 🎯 目标

实现 **课程与班级的批量导入 / 导出功能**，防止前端阻塞或接口超时。  
通过 Celery + Redis 将耗时操作放入后台异步执行，Django 只负责“下任务单 + 查任务状态”。

---

## 🧠 系统设计思路

### 1️⃣ 技术结构

| 组件                 | 作用                                               |
| -------------------- | -------------------------------------------------- |
| **Redis**            | 消息队列（Broker）+ 任务结果缓存（Result Backend） |
| **Celery Worker**    | 后台异步任务执行器                                 |
| **Django**           | 提供 API（创建任务、查询状态）                     |
| **MinIO / 本地存储** | 存放导出/导入的 CSV 文件                           |
| **前端（Next.js）**  | 提交任务 → 轮询状态 → 显示进度 / 下载结果          |

---

## ⚙️ 后端实现细节

### 🧩 1. Celery 基础配置

```python
CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_TIME_LIMIT = 600
```

Celery Worker 与 Django 共用相同 `.env` 数据库配置。

### 🧩 2. 文件存储工具

```python
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

def save_bytes(path: str, data: bytes) -> str:
    final_path = default_storage.save(path, ContentFile(data))
    return default_storage.url(final_path)
```

### 🧩 3. 异步任务定义

**导出任务：**

```python
@shared_task(bind=True)
def export_courses_task(self, filters=None):
    from catalog.models import Course
    import csv, io
    from datetime import datetime
    qs = Course.objects.all().order_by("id")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id","code","title","credits"])
    for c in qs:
        w.writerow([c.id, c.code, c.title, c.credits])
    data = buf.getvalue().encode("utf-8-sig")
    key = f"exports/courses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    url = save_bytes(key, data)
    return {"status":"success","download_url":url,"count":qs.count()}
```

**导入任务：**

```python
@shared_task(bind=True)
def import_courses_task(self, storage_path):
    raw = read_bytes(storage_path)
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    ok, fail = 0, 0
    for row in reader:
        code = (row.get("code") or "").strip()
        if not code: continue
        Course.objects.update_or_create(
            code=code,
            defaults={
                "title": row.get("title") or "",
                "description": row.get("description") or "",
                "credits": row.get("credits") or "3.0",
            },
        )
        ok += 1
    return {"status":"success","ok":ok,"fail":fail}
```

### 🧩 4. API 设计

| Endpoint                | 方法   | 描述                         |
| ----------------------- | ------ | ---------------------------- |
| `/api/exports/courses`  | `POST` | 创建课程导出任务             |
| `/api/imports/courses`  | `POST` | 上传 CSV 并创建导入任务      |
| `/api/tasks/<task_id>`  | `GET`  | 查询任务状态与结果           |
| `/api/exports/sections` | `POST` | 导出班级（ClassSection）数据 |

**返回示例：**

```json
{
  "state": "SUCCESS",
  "result": {
    "status": "success",
    "download_url": "/media/exports/courses_20251014_002105.csv",
    "count": 5
  }
}
```

### 🧩 5. 运行流程

```bash
# 启动 Redis
docker run -d --name redis -p 6379:6379 redis:7

# 启动 Django
python manage.py runserver 8000

# 启动 Celery Worker
celery -A core worker -l info
```

---

## 💻 前端实现细节（Next.js）

### 📤 批量导出/导入组件

**src/components/CourseBulkIO.tsx**

- 提供导出课程 CSV 按钮；
- 支持导入 CSV 上传；
- 自动轮询任务状态并提示结果。

```tsx
const data = await authFetch("/api/exports/courses", { method: "POST" });
const { task_id } = data;
const timer = setInterval(async () => {
  const s = await authFetch(`/api/tasks/${task_id}`);
  if (s.state === "SUCCESS") {
    clearInterval(timer);
    window.open(API_BASE + s.result.download_url, "_blank");
  }
}, 2000);
```

---

## ✅ 实现成果

| 模块               | 功能点               | 说明                              |
| ------------------ | -------------------- | --------------------------------- |
| 🧮 Celery 异步任务 | 后台执行导入导出     | 防止请求超时                      |
| 📦 Redis           | 任务队列 / 结果存储  | `redis://localhost:6379/0`        |
| 📂 文件存储        | 本地或 MinIO         | 导出结果保存与访问                |
| 🧾 导出任务        | 课程 / 班级 CSV      | 支持 filters                      |
| 📥 导入任务        | 课程批量导入         | 以 code 为自然键 upsert           |
| 🔁 状态查询接口    | `/api/tasks/<id>`    | 实时状态 PENDING/PROGRESS/SUCCESS |
| 🖥️ 前端集成        | 自动轮询、下载、提示 | 一键导入导出                      |

---

## 🚀 后续可扩展

- 导出教师课表、成绩单；
- Celery Beat 定时任务（周报/自动导出）；
- 错误报告 CSV 生成；
- 任务持久化（数据库记录进度）。

---

## 📘 小结

本部分实现了项目的 **异步执行引擎**：

> Django 派发任务，Celery + Redis 异步执行，前端轮询状态。

具备企业级特性：

- ✅ 可扩展性（分布式任务执行）
- ✅ 可维护性（统一任务架构）
- ✅ 可视化（统一任务查询接口）
  """

# 🔔 通知系统实现总结 (v1.3)

## 1️⃣ 核心能力与闭环

- **发布**：教师/管理员创建公告（面向全体学生）。
- **投递**：Celery 异步生成每个学生的 Delivery 投递记录。
- **送达**：学生进入消息中心后标记 delivered（自动或手动）。
- **确认**：学生点击“确认已读”，状态变为 acknowledged。
- **监管**：教师查看确认率、未确认名单，可撤回、重发提醒。
- **角标**：未读数 = Delivery.state != acknowledged。

## 2️⃣ 后端结构（Django + DRF + Celery）

### 模型

**Announcement**

- title, body, audience, publisher, status, publish_at, created_at, updated_at

**Delivery**

- announcement, user, state(queued/delivered/acknowledged), delivered_at, ack_at, last_push_at, retry_count
- 唯一约束 (announcement, user)，索引 (user,state)、(announcement)

### 主要接口

| Endpoint                                | 方法 | 说明                                 |
| --------------------------------------- | ---- | ------------------------------------ |
| /api/announcements/                     | POST | 教师创建公告，后台触发 Celery fanout |
| /api/announcements/{id}/withdraw/       | POST | 撤回公告                             |
| /api/announcements/{id}/stats/          | GET  | 统计确认率                           |
| /api/announcements/{id}/remind_unacked/ | POST | 重发提醒（更新 retry_count）         |
| /api/deliveries/                        | GET  | 学生收件箱                           |
| /api/deliveries/{id}/delivered/         | POST | 标记已展示                           |
| /api/deliveries/{id}/ack/               | POST | 确认已读                             |
| /api/unread_count                       | GET  | 返回未读数                           |

### 状态机

发布 (published) → fanout_all_students (Celery)
→ Delivery: queued → delivered → acknowledged

### Celery 任务

- fanout_all_students(announcement_id)：为所有学生创建 Delivery（分批、幂等）。
- 预留：push_notify_unacked、daily_digest_unacked。

## 3️⃣ 前端结构（Next.js）

### /messages 页面

Tabs:

- 收件箱（学生）: 标题、发布者、时间、状态；操作：标记已展示、确认已读。
- 我发布的（教师/管理员）: 发布表单、列表（统计、撤回、重发提醒）。

角标：调用 /api/unread_count 获取数字显示在铃铛。

状态流：queued → delivered → acknowledged

## 4️⃣ 权限与角色控制

| 角色              | 权限                                     |
| ----------------- | ---------------------------------------- |
| student           | 查看收件箱、确认已读                     |
| teacher           | 发布、查看自己公告、查看统计、撤回、提醒 |
| manager/registrar | 全量管理所有公告                         |

## 5️⃣ 性能与可靠性

- Celery 分批 bulk_create(ignore_conflicts=True)（500 ～ 1000/批）。
- ACK、delivered 幂等。
- 索引优化：(user,state)、(announcement)。

## 6️⃣ 调试与联调

curl -X POST /api/announcements/
curl -H Authorization:Student /api/deliveries
curl -X POST /api/deliveries/1/ack/
curl -H Authorization:Teacher /api/announcements/1/stats/

## 7️⃣ 可运维与可观测

- 监控 Celery fanout 成功/失败。
- 教师查看确认率、提醒次数。
- 异常自动重试。

## 8️⃣ 后续拓展方向

- 按课程/班级受众。
- 实时推送 (WS/SSE + Redis)。
- 邮件/Push 通知。
- 未确认名单导出 CSV。
- 富文本公告、附件、编辑历史。

## ✅ 小结

> 实现了发布 → 投递 → 送达 → 确认 → 统计闭环。
> Delivery 确保可靠送达，Celery 异步保障性能。
> 权限基于用户角色，可扩展、可监控、可演进。
> """

## 📦 通知系统中的队列机制说明 (v1.3)

## 一、系统中使用队列的部分

当前通知系统采用 **Celery + Redis** 实现异步任务处理，其中 Redis 作为 **消息队列（Message Broker）**。

### 队列的主要用途

| 阶段            | 动作                                                              | 说明                       |
| --------------- | ----------------------------------------------------------------- | -------------------------- |
| 教师发布公告    | Django 保存 Announcement → 调用 `fanout_all_students.delay(a.id)` | 将任务消息推入 Redis 队列  |
| Worker 监听队列 | `celery -A core worker -l info` 监听任务队列                      | Worker 从 Redis 取任务执行 |
| Worker 执行任务 | 批量为每个学生生成 Delivery 投递记录                              | 异步执行，避免主线程阻塞   |
| Worker 完成任务 | 写入数据库并记录结果                                              | 可自动重试或监控状态       |

**总结**：队列使系统能高效异步地处理“公告批量投递”这一耗时任务。

---

## 二、系统运行逻辑

```
教师发布公告（HTTP 请求）
      ↓
Django 保存 Announcement
      ↓
Celery.delay() 把任务放入 Redis 队列
      ↓
Celery Worker 从队列取任务
      ↓
批量创建 Delivery（每个学生一条）
      ↓
任务完成
```

### 队列带来的好处

| 维度     | 优势                                      |
| -------- | ----------------------------------------- |
| 性能     | 发布公告无需等待批量写入，返回速度快      |
| 可靠性   | Celery 自动重试，任务失败不会丢失         |
| 可扩展性 | 支持多 worker 并发处理上千用户            |
| 可观测性 | Celery 可查看任务执行状态 SUCCESS/FAILURE |

---

## 三、前端与队列的关系

当前前端（消息中心）**不直接连接队列**。

- 学生端通过 HTTP API 轮询消息状态；
- 队列仅在后端存在，用于异步处理；
- 若未来升级实时推送（WebSocket/SSE），Celery + Redis 仍可作为分发层。

---

## 四、系统模块与队列关系对照

| 功能模块                           | 是否使用消息队列  | 用途                   |
| ---------------------------------- | ----------------- | ---------------------- |
| 教师发布公告 → fanout_all_students | ✅ 是             | 异步生成投递记录       |
| 学生收件箱 / 确认已读              | ❌ 否             | 直接访问数据库         |
| 教师重发提醒                       | ✅ 是（未来扩展） | 异步通知、邮件推送     |
| WebSocket 实时推送                 | ✅ 是（未来扩展） | Redis Pub/Sub 分发事件 |

---

## 五、总结

通知系统的异步队列机制承担“后台批量分发”的任务：

> Django 主进程负责派发任务，Celery Worker 通过 Redis 队列异步执行。

这样既提升了性能，也确保了任务的可靠性和可扩展性。

# 多用户连接池技术概念详解

本说明旨在梳理当前项目中涉及的所有“连接池化”机制，帮助团队理解它们的定位、解决的问题、优缺点与适用边界。

---

## 1️⃣ 数据库连接池

### Django 自带持久连接（`CONN_MAX_AGE`）

- **定义**：在 Django 进程内维持 TCP 连接复用，避免每次请求都重建连接。
- **作用**：降低连接建立开销，提高延迟稳定性。
- **边界**：仅限单进程，无法跨容器或实例共享连接。
- **优点**：简单、无依赖。
- **缺点**：无法限流或队列，仍可能触发数据库连接过载。
- **适用场景**：开发或低并发环境；可与 PgBouncer 组合使用。

### PgBouncer（外部数据库连接池）

- **定义**：PostgreSQL 官方推荐的轻量级连接池代理。
- **作用**：复用后端连接、集中限流、缓冲瞬时高并发。
- **工作模式**：
  - `session`：连接独占，会话结束释放。
  - `transaction`（推荐）：事务期间借用连接，性能高且安全。
  - `statement`：语句级复用，兼容性差。
- **优点**：跨进程/容器共享池，具备排队和后压机制。
- **缺点**：无法维持会话级状态（事务外变量无效）。
- **适用场景**：生产环境、并发量大、Celery Worker 共用数据库时。

---

## 2️⃣ Redis 连接池

### 客户端连接池（`redis-py` / `django-redis`）

- **定义**：在应用侧维护有限数量的到 Redis 的 TCP 连接。
- **作用**：减少频繁建连、控制最大连接数。
- **边界**：仅限客户端进程，Redis 端不感知“池”的存在。
- **优点**：高性能、可限流。
- **缺点**：需谨慎配置上限，防止爆发式连接。
- **适用场景**：缓存、分布式锁、会话存储。

### Celery Broker/Result 连接池

- **定义**：Celery 与 Redis 的连接管理（Broker/Result 分开维护）。
- **作用**：限制任务分发与回传时的 Redis 连接使用。
- **优点**：防止 Worker 并发过多导致连接耗尽。
- **缺点**：过小会造成任务延迟。
- **适用场景**：异步任务分发、后台导入导出、通知广播等。

---

## 3️⃣ 对象存储（MinIO/S3）HTTP 复用

- **定义**：基于 HTTP Keep-Alive 的持久连接复用机制。
- **作用**：复用 TLS/TCP 通道，降低握手和传输开销。
- **优点**：透明、低成本、高效。
- **缺点**：大并发时需限制上传并发与分块大小。
- **适用场景**：课程文件、课件、附件上传下载。

---

## 4️⃣ HTTP 客户端连接复用（Node/Next.js 服务端）

- **定义**：Node.js 通过 `http.Agent` 维护长连接池，实现 Keep-Alive。
- **作用**：降低 SSR 与后端交互的网络延迟。
- **边界**：仅对服务端 fetch 生效，浏览器端由浏览器自动管理。
- **优点**：降低抖动、提升 QPS。
- **缺点**：maxSockets 过大易导致 API 被突刺。
- **适用场景**：Next.js 服务端渲染、调用 Django API。

---

## 5️⃣ Web 服务器池（Gunicorn / Uvicorn）

- **定义**：通过多进程/线程形成的“计算池”，实现并发请求处理。
- **作用**：提高吞吐并行度，与数据库/Redis 池协同工作。
- **优点**：扩展性好；适合 CPU/IO 混合型任务。
- **缺点**：需与下游连接池匹配，否则造成资源过载。
- **适用场景**：生产部署，需动态调节 `workers × threads`。

---

## 6️⃣ 任务队列连接池（Celery）

- **定义**：任务层面的并发池与连接池，用于分发和执行异步任务。
- **作用**：实现后台任务的异步解耦与限流。
- **优点**：高可扩展，支持重试与错峰。
- **缺点**：配置复杂，连接/任务数需严格监控。
- **适用场景**：异步导入导出、邮件通知、公告推送。

---

## 7️⃣ 池化机制的共性特征

| 特性     | 说明                                     |
| -------- | ---------------------------------------- |
| **复用** | 避免频繁建连、握手、TLS 开销             |
| **限流** | 控制下游连接总量，防止打爆资源           |
| **隔离** | 不同进程/组件各自维护池，需全局规划      |
| **幂等** | 任务重试/排队时需保持幂等性              |
| **监控** | 必须监控连接数、等待队列、P95 延时等指标 |
| **匹配** | 上游 worker 并发需与下游连接池容量匹配   |

---

## 8️⃣ 实践建议总结

| 组件       | 建议方案                                       | 核心参数                                      |
| ---------- | ---------------------------------------------- | --------------------------------------------- |
| PostgreSQL | PgBouncer(transaction) + Django `CONN_MAX_AGE` | `default_pool_size=20`, `CONN_MAX_AGE=120`    |
| Redis      | django-redis + Celery Pool 限制                | `max_connections=200`, `broker_pool_limit=50` |
| 对象存储   | HTTP Keep-Alive + 并发阈值                     | 并发 ≤10，分块 ≥5MB                           |
| Next.js    | `http.Agent` keep-alive                        | `maxSockets=200`                              |
| Web 服务   | Gunicorn/Uvicorn workers 合理配置              | `workers=CPU×2`, `threads=2`                  |
| Celery     | 并发与 prefetch 匹配                           | `concurrency=4`, `prefetch=1`                 |

---

## ✅ 总结

连接池是**高并发系统的“节流阀”与“稳压器”**：

> 它通过复用、限流、隔离让系统稳定高效地利用资源，避免雪崩。  
> 在本项目中，数据库（PgBouncer）、缓存（Redis）、异步队列（Celery）三层联动，形成了完整的“资源池化闭环”。
> """
