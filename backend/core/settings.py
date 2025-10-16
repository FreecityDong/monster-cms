"""
core/settings.py – 本地开发完整配置
支持：
- django-environ 从 .env 读取变量
- PostgreSQL、Redis、MinIO、JWT、CORS
"""

import os
import environ
from pathlib import Path
from datetime import timedelta

# -------------------------------------------------------------------
# 基础路径与环境变量
# -------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
# 读取项目根目录上一级的 .env
environ.Env.read_env(os.path.join(BASE_DIR.parent, '.env'))

# -------------------------------------------------------------------
# 安全与调试
# -------------------------------------------------------------------
SECRET_KEY = env('DJANGO_SECRET', default='dev-insecure-key')
DEBUG = env.bool('DJANGO_DEBUG', default=True)
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['*'])

# -------------------------------------------------------------------
# 应用定义
# -------------------------------------------------------------------
INSTALLED_APPS = [
    # 系统默认
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 第三方
    'rest_framework',
    'corsheaders',
    'storages',

    # 项目模块
    'users',
    'catalog',
    'classes',
    'assignments',
    'evaluations',
    'analytics',
    'notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 必须放在最前
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# -------------------------------------------------------------------
# 数据库配置（PostgreSQL）
# -------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB', default='cms'),
        'USER': env('POSTGRES_USER', default='cms'),
        'PASSWORD': env('POSTGRES_PASSWORD', default='cms'),
        'HOST': env('POSTGRES_HOST', default='localhost'),
        'PORT': env('POSTGRES_PORT', default='5432'),
    }
}

# -------------------------------------------------------------------
# 自定义用户模型
# -------------------------------------------------------------------
AUTH_USER_MODEL = 'users.User'

# -------------------------------------------------------------------
# REST Framework + JWT
# -------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# -------------------------------------------------------------------
# 跨域 (CORS)
# -------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list('CORS_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])
CORS_ALLOW_CREDENTIALS = True

# -------------------------------------------------------------------
# MinIO / S3 存储配置
# -------------------------------------------------------------------
AWS_S3_ENDPOINT_URL = f"http://localhost:{env('MINIO_PORT', default='9000')}"
AWS_STORAGE_BUCKET_NAME = env('MINIO_BUCKET', default='cms')
AWS_ACCESS_KEY_ID = env('MINIO_ROOT_USER', default='minio')
AWS_SECRET_ACCESS_KEY = env('MINIO_ROOT_PASSWORD', default='minio123')
AWS_S3_REGION_NAME = "us-east-1"
AWS_S3_SIGNATURE_VERSION = "s3v4"

# -------------------------------------------------------------------
# Celery（Redis 作为消息队列）
# -------------------------------------------------------------------
CELERY_BROKER_URL = f"redis://localhost:{env('REDIS_PORT', default='6379')}/0"
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
# === Celery + Redis ===
CELERY_TASK_TIME_LIMIT = 60 * 10           # 单任务硬超时：10分钟
CELERY_TASK_SOFT_TIME_LIMIT = 60 * 9       # 软超时
CELERY_TASK_TRACK_STARTED = True           # 允许显示 STARTED 状态
CELERY_RESULT_EXPIRES = 60 * 60 * 6        # 结果保留 6 小时

# -------------------------------------------------------------------
# 语言、时区、静态文件
# -------------------------------------------------------------------
LANGUAGE_CODE = 'zh-hans'
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# -------------------------------------------------------------------
# 日志配置（开发版简化）
# -------------------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
}

# core/settings.py
AUTH_PASSWORD_VALIDATORS = [
    # 最小长度（自定义为 10）
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 6},
    },
    # 常见弱口令（123456、password 等）
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    # 禁止纯数字
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    # 复杂度与包含检查（自定义）
    {"NAME": "users.validators.ComplexityValidator"},
]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "noreply@example.com"
SITE_URL = "http://localhost:3000"  # 前端地址，用于拼接重置链接


ACCESS_DAYS = int(env("ACCESS_TOKEN_DAYS", default=1))
REFRESH_DAYS = int(env("REFRESH_TOKEN_DAYS", default=7))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=ACCESS_DAYS),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=REFRESH_DAYS),
}

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

INSTALLED_APPS += ['jobs']

INSTALLED_APPS += ['notices']