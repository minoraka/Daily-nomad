# Student Board

A site where students keep a personal kanban board (*Planned → In progress → Done*) and post a short daily report
(a "daily") about their work. Students and teachers can view any group's board and dailies; nobody grades anything.
The look follows the college LMS: dark/light theme, Russian / English / Kyrgyz.

- `backend/` — Django 5 + Django REST Framework, JWT (simplejwt)
- `frontend/` — React + Vite + TypeScript, react-i18next, dnd-kit
- `docs/superpowers/` — design spec and implementation plan

**Quick start:** `./start.sh` (macOS/Linux) or `start.bat` (Windows) — see [ЗАПУСК.md](ЗАПУСК.md) (in Russian).

## Requirements

Python 3.12+, Node 20+, `gettext` (only to recompile translations).

## Backend

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createsuperuser     # admin account for /admin
.venv/bin/python manage.py seed_demo           # optional demo data
.venv/bin/python manage.py runserver           # http://localhost:8000
```

`seed_demo` creates groups ИС-21 and ИС-22, students `student1`…`student6` and teacher `demo_teacher`
(password `demo12345` for all).

**Groups** are created in the Django admin: <http://localhost:8000/admin/> → Groups → Add.
Students choose their group when they sign up; teachers have no group and switch between groups on the board.

Settings via environment: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG` (`0` in production), `DJANGO_ALLOWED_HOSTS`,
`SQLITE_PATH`. Time zone is `Asia/Bishkek` — "today" for dailies and streaks is counted there.

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api to localhost:8000
```

`npm run build` produces `frontend/dist/` — serve it with any static server and route `/api` to Django.

## Tests

```bash
cd backend && .venv/bin/pytest            # API, permissions, streak, translations
cd frontend && npx vitest run             # API client, board ordering, i18n
cd frontend && npx playwright test        # end-to-end (starts its own servers on 8001/5174)
```

## Rules in short

- One daily per student per day; it can be edited or deleted only on the same day.
- Streak = consecutive study days (Mon–Sat) with a daily. Sunday neither breaks nor adds to it.
- Only the owner can change their tasks and dailies; teachers only read.

## Translations

UI strings live in `frontend/src/i18n/{ru,en,ky}.json`; server error messages in
`backend/locale/{ru,ky}/LC_MESSAGES/django.po` (recompile with `python manage.py compilemessages`).
The Kyrgyz translation was written without a native speaker — please have it proofread.
