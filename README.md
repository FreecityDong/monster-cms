# 怪物课程管理系统（Monorepo）

**Tech Stack:** Django + DRF + PostgreSQL + Redis + Celery + Next.js + Tailwind

---

## 📂 项目结构

```
web_dev/
├─ backend/      # Django/DRF/Celery 后端服务
├─ frontend/     # Next.js App Router 前端界面
└─ docs/         # 设计文档与技术总结
```

---

## 🚀 本地运行指南

### ▶️ 后端（Backend）

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -U pip -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

### ▶️ Celery Worker

```bash
cd backend
source .venv/bin/activate
celery -A core worker -l info
```

### ▶️ 前端（Frontend）

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

前端默认运行在 `http://localhost:3000`，后端在 `http://localhost:8000`。

---

## ⚙️ 环境变量说明

### backend/.env.example

```env
POSTGRES_USER=cms
POSTGRES_PASSWORD=***REPLACE***
POSTGRES_DB=cms
POSTGRES_PORT=5432

REDIS_PORT=6379

MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=***REPLACE***
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=cms

DJANGO_SECRET=***REPLACE***
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=*
DJANGO_PORT=8000
CORS_ORIGINS=http://localhost:3000

NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### frontend/.env.example

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 🧩 技术要点

- **后端：** Django REST Framework + Celery 异步任务 + MinIO 文件存储
- **前端：** Next.js App Router + TailwindCSS + JWT 登录态管理
- **数据库：** PostgreSQL（推荐配合 PgBouncer）
- **缓存与队列：** Redis（Cache + Celery Broker）
- **文件对象存储：** MinIO 本地模拟 S3
- **消息系统：** 支持教师发布公告、学生确认阅读
- **异步任务：** 批量导出、导入、文件生成、通知投递

---

## 🧪 测试与运行

```bash
# 后端单元测试
cd backend
pytest -q

# 构建前端生产版本
cd frontend
npm run build
npm run start
```

---

## ☁️ 推送到 GitHub

```bash
git init -b main
git add .
git commit -m "feat: initial monorepo (backend+frontend+docs)"

# 若使用 GitHub CLI
gh auth login
gh repo create your-org/monster-cms --public --source=. --remote=origin
git push -u origin main
```

---

## 🔐 安全与协作

- 切勿提交 `.env`、`/media/`、`node_modules/`、`.venv/`。
- 已在 `.gitignore` 屏蔽敏感路径。
- 若曾误提交密钥，请使用 `git filter-repo` 或 BFG 清理历史并旋转密钥。
- 可提交 `.env.example` 帮助他人配置。

---

## 🧭 后续可拓展方向

- WebSocket / SSE 实时通知
- Docker Compose 一键部署
- CI/CD + 自动测试与构建
- PgBouncer / Redis 集群化部署
- 富文本公告、附件编辑历史

---

## 🏁 作者与版本

- Author: **Monster Course System Team**
- Version: **v1.3-dev**
- License: MIT
  """
