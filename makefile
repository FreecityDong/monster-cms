include .env
.PHONY: infra up down be fe

infra:
\tdocker compose up -d
up: infra be fe

down:
\tdocker compose down

be:
\tcd backend && . .venv/bin/activate && python manage.py runserver ${DJANGO_PORT}

fe:
\tcd frontend && npm run dev