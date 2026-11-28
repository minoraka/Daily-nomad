#!/usr/bin/env bash
# Student Board — запуск бэкенда и фронтенда одной командой (macOS / Linux).
set -e
cd "$(dirname "$0")"

PY=${PYTHON:-python3}
command -v "$PY" >/dev/null || { echo "Нужен Python 3.12+ (команда $PY не найдена)"; exit 1; }
command -v npm >/dev/null || { echo "Нужен Node.js 20+ (команда npm не найдена)"; exit 1; }

echo "== Бэкенд: зависимости и база =="
cd backend
[ -d .venv ] || "$PY" -m venv .venv
.venv/bin/pip install -q --disable-pip-version-check -r requirements.txt
.venv/bin/python manage.py migrate -v0
.venv/bin/python manage.py seed_demo
cd ..

echo "== Фронтенд: зависимости =="
cd frontend
[ -d node_modules ] || npm install --no-audit --no-fund
cd ..

echo "== Запуск =="
(cd backend && .venv/bin/python manage.py runserver 8000) &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT INT TERM

echo ""
echo "  Сайт:    http://localhost:5173"
echo "  Админка: http://localhost:8000/admin"
echo "  Демо-вход: student1 / demo12345  (преподаватель: demo_teacher / demo12345)"
echo "  Остановить: Ctrl+C"
echo ""
cd frontend && npm run dev
