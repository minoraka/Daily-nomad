# Student Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сайт, где студенты ведут личный канбан задач и пишут ежедневные «дейлики», видимые всем в потоке; внешний вид — как LMS колледжа, две темы, три языка.

**Architecture:** Два независимых проекта в одном репо: `backend/` — Django + DRF REST API с JWT; `frontend/` — React SPA (Vite, TS), ходит в `/api/` через axios. В dev Vite проксирует `/api` на `localhost:8000`, CORS разрешён для `localhost:5173`.

**Tech Stack:** Python 3.13, Django 5.x, djangorestframework, djangorestframework-simplejwt, django-cors-headers, django-filter, pytest-django, time-machine; Node 22, React 18, Vite, TypeScript, react-router-dom 6, react-i18next, @dnd-kit/core + @dnd-kit/sortable, axios, lucide-react, Vitest, Playwright (предустановлен).

**Spec:** `docs/superpowers/specs/2026-11-27-student-board-design.md` (+ скриншоты в `docs/superpowers/specs/reference/`)

## Global Constraints

- `TIME_ZONE = "Asia/Bishkek"`, `USE_TZ = True`; «сегодня» = `timezone.localdate()`.
- `LANGUAGES = [("ru", ...), ("en", ...), ("ky", ...)]`, `LANGUAGE_CODE = "ru"`; фронт шлёт `Accept-Language` с текущим языком.
- Роли: `student` | `teacher`. Статусы задач: `todo` | `in_progress` | `done`.
- Учебная неделя пн–сб; воскресенье в стрике не учитывается и его не рвёт.
- Дейлик: unique (author, date); создаётся только на сегодня; PATCH/DELETE только автором и только если `date == localdate()`.
- Создавать задачи/дейлики может только `student`; менять/удалять — только владелец (403 иначе).
- Без XP, монет, чатов, расписания, тестов, материалов, новостей, комментариев.
- Нет UI-библиотек: свой CSS на переменных `--bg --surface --surface-2 --text --text-muted --accent --success --border`; тема — `data-theme="dark|light"` на `<html>`; по умолчанию `dark` и `ru`; выбор в `localStorage` (`sb-theme`, `sb-lang`).
- Каждая строка UI — через `t()`; ключи во всех трёх `ru.json / en.json / ky.json`.
- Узкая центральная колонка ~680px для всех страниц, кроме доски (широкая, три колонки).

## Review Focus

1. **Полночь по Бишкеку.** В 20:30 UTC в Бишкеке уже следующий день: дейлик должен лечь на бишкекскую дату, а вчерашний — стать нередактируемым. → тест `test_daily_date_uses_bishkek_midnight` в Task 3.
2. **Перенос в пустую колонку / позиция за пределами.** `move` с `position` больше длины колонки или в пустую колонку не должен падать и должен ставить карточку в конец. → `test_move_into_empty_column_and_clamps_position` в Task 2.
3. **Чужая карточка в дейлике.** Студент передаёт в `task_ids` id чужой карточки — 400, а не тихая привязка. → `test_daily_rejects_foreign_task` в Task 3.
4. **Регистрация с неверной парой роль/поток.** Студент без потока или преподаватель с потоком — 400. → `test_register_role_group_validation` в Task 1.
5. **Истёкший access-токен посреди работы.** Запрос с 401 должен один раз обновить токен и повториться; если refresh тоже истёк — выход на `/login`, а не белый экран. → `client.test.ts` в Task 5.

---

## File Structure

```
backend/
  requirements.txt
  manage.py, pytest.ini, conftest.py
  config/settings.py, urls.py
  accounts/   models.py (User, Group), serializers.py, views.py, urls.py, admin.py, tests/
  board/      models.py (Task), serializers.py, views.py, urls.py, services.py (move_task), admin.py, tests/
  dailies/    models.py (Daily), serializers.py, views.py, urls.py, streak.py, admin.py, tests/,
              management/commands/seed_demo.py
  locale/ky/LC_MESSAGES/django.po
frontend/
  package.json, vite.config.ts, index.html, playwright.config.ts
  src/main.tsx, App.tsx (роутер)
  src/api/client.ts (axios + JWT), types.ts, endpoints.ts
  src/auth/AuthContext.tsx, RequireAuth.tsx
  src/i18n/index.ts, ru.json, en.json, ky.json
  src/theme/ThemeContext.tsx, tokens.css, base.css
  src/layout/AppLayout.tsx, Sidebar.tsx, Topbar.tsx, GroupSwitcher.tsx, StudentFilter.tsx, Avatar.tsx, PillTabs.tsx
  src/pages/Login.tsx, Register.tsx, Home.tsx, Board.tsx, Dailies.tsx, Profile.tsx
  src/board/BoardColumns.tsx, TaskCard.tsx, TaskModal.tsx, ordering.ts
  src/dailies/DailyItem.tsx, DailyForm.tsx, StreakCard.tsx
  e2e/smoke.spec.ts
README.md
```

---

### Task 1: Backend — проект, пользователи, потоки, авторизация

**Files:**
- Create: `backend/requirements.txt`, `backend/manage.py`, `backend/pytest.ini`, `backend/conftest.py`, `backend/config/{settings,urls}.py`, `backend/accounts/{models,serializers,views,urls,admin}.py`, `backend/accounts/tests/test_auth.py`, `.gitignore`

**Interfaces:**
- Produces:
  - `accounts.models.Group(name: CharField(100, unique))`, `Meta.ordering = ["name"]`
  - `accounts.models.User(AbstractUser)` + `role: CharField(choices student/teacher)`, `group: FK(Group, null=True, on_delete=PROTECT, related_name="members")`; `AUTH_USER_MODEL = "accounts.User"`
  - `accounts.serializers.AuthorSerializer` → `{id, first_name, last_name, initials}` (`initials` = первые буквы фамилии и имени, upper: «Востриков Владимир» → «ВВ»)
  - `accounts.serializers.MeSerializer` → `{id, username, first_name, last_name, initials, role, group: {id,name}|null}` (стрик добавит Task 3)
  - Endpoints: `POST /api/auth/register/` → 201 `{access, refresh, user}`; `POST /api/auth/token/`, `POST /api/auth/token/refresh/` (simplejwt); `GET /api/auth/me/`; `GET /api/groups/` (AllowAny); `GET /api/groups/{id}/students/` → `[Author]`
  - REST_FRAMEWORK: `DEFAULT_AUTHENTICATION_CLASSES = JWTAuthentication`, `DEFAULT_PERMISSION_CLASSES = IsAuthenticated`, `DEFAULT_FILTER_BACKENDS = DjangoFilterBackend`
  - `conftest.py` фикстуры: `group`, `other_group`, `student(group)`, `student2(group)`, `teacher`, `api` (APIClient), `auth(user) -> APIClient` (через `force_authenticate`)

- [ ] **Step 1: Окружение.** `requirements.txt`: `Django>=5.1,<6`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, `django-filter`, `pytest`, `pytest-django`, `time-machine`. `python -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt`. `.gitignore`: `.venv/ node_modules/ db.sqlite3 __pycache__/ dist/ test-results/`.

- [ ] **Step 2: Failing tests** в `accounts/tests/test_auth.py`:

```python
def test_register_student_returns_tokens(api, group):
    r = api.post("/api/auth/register/", {"username": "anya", "password": "Str0ng-pass!",
        "first_name": "Аня", "last_name": "Иванова", "role": "student", "group": group.id})
    assert r.status_code == 201
    assert {"access", "refresh"} <= r.data.keys()
    assert r.data["user"]["group"]["id"] == group.id

@pytest.mark.parametrize("role,with_group", [("student", False), ("teacher", True)])
def test_register_role_group_validation(api, group, role, with_group):
    data = {"username": "x", "password": "Str0ng-pass!", "first_name": "A", "last_name": "B", "role": role}
    if with_group: data["group"] = group.id
    assert api.post("/api/auth/register/", data).status_code == 400

def test_me_requires_auth(api):
    assert api.get("/api/auth/me/").status_code == 401

def test_me_returns_initials(auth, student):
    assert auth(student).get("/api/auth/me/").data["initials"] == "ИА"  # student: last_name Иванова, first_name Аня

def test_groups_list_is_public(api, group):
    assert api.get("/api/groups/").status_code == 200

def test_group_students_lists_only_students(auth, group, student, teacher):
    ids = [u["id"] for u in auth(teacher).get(f"/api/groups/{group.id}/students/").data]
    assert ids == [student.id]
```

- [ ] **Step 3: Run** `cd backend && .venv/bin/pytest accounts -q` → FAIL (нет проекта/моделей).

- [ ] **Step 4: Implement.** `django-admin startproject config .`, приложение `accounts`; настройки по Global Constraints; `CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]`; `SIMPLE_JWT`: access 30 мин, refresh 7 дней. Регистрация: пароль через `validate_password`, `create_user`. Миграции. В админке зарегистрировать `User` (UserAdmin + поля role, group) и `Group`.

- [ ] **Step 5: Run** `.venv/bin/pytest accounts -q` → PASS.

- [ ] **Step 6: Commit** `feat(backend): project setup, users, groups, JWT auth`

---

### Task 2: Backend — задачи (канбан) и перенос

**Files:**
- Create: `backend/board/{models,serializers,views,urls,services,admin}.py`, `backend/board/tests/test_tasks.py`
- Modify: `backend/config/{settings,urls}.py`

**Interfaces:**
- Consumes: `User`, `AuthorSerializer`, фикстуры из Task 1.
- Produces:
  - `board.models.Task(owner FK User CASCADE related_name="tasks", title CharField(200), description TextField(blank), status CharField choices, default "todo", position PositiveIntegerField default 0, created_at, updated_at)`
  - `board.services.move_task(task: Task, status: str, position: int) -> Task` — в `transaction.atomic`: убрать карточку из списка своих карточек целевой колонки (по `position, id`), вставить на индекс `min(max(position,0), len)`, перенумеровать 0..n целевую колонку и колонку-источник (только карточки этого владельца).
  - `TaskSerializer` → `{id, owner: Author, title, description, status, position, created_at, updated_at}`; `owner/position` read-only.
  - `GET /api/tasks/?group=<id>&owner=<id>&status=` — порядок `status, owner__last_name, owner__first_name, position`. `POST` — только student, `position` = в конец колонки `todo`. `PATCH/DELETE` — только владелец. `POST /api/tasks/{id}/move/` `{status, position}` → 200 Task.

- [ ] **Step 1: Failing tests** (`board/tests/test_tasks.py`), главные:

```python
def test_student_creates_task_at_end_of_todo(auth, student): ...  # две подряд → position 0, 1; status "todo"
def test_teacher_cannot_create_task(auth, teacher): ...           # 403
def test_cannot_edit_or_delete_foreign_task(auth, student, student2): ...  # PATCH и DELETE → 403
def test_filter_by_group_and_owner(auth, student, other_group_student): ... # ?group= возвращает только свой поток
def test_move_reorders_within_column(auth, student):
    # todo: a(0), b(1), c(2); move c → todo, 0  ⇒ c,a,b с позициями 0,1,2
def test_move_into_empty_column_and_clamps_position(auth, student):
    # move a → done, position 99 ⇒ status done, position 0; источник перенумерован 0..n
def test_move_does_not_touch_other_owners(auth, student, student2): ...  # позиции student2 не меняются
```

Фикстура `other_group_student` — студент из `other_group` (добавить в `conftest.py`).

- [ ] **Step 2: Run** `.venv/bin/pytest board -q` → FAIL.
- [ ] **Step 3: Implement** модель, `move_task`, `TaskViewSet` (ModelViewSet + `@action(detail=True, methods=["post"]) move`), права `IsOwnerOrReadOnly` + `IsStudentToCreate` в `board/views.py`; admin.
- [ ] **Step 4: Run** `.venv/bin/pytest -q` → PASS.
- [ ] **Step 5: Commit** `feat(backend): tasks API with move/reorder`

---

### Task 3: Backend — дейлики, стрик, профиль

**Files:**
- Create: `backend/dailies/{models,serializers,views,urls,streak,admin}.py`, `backend/dailies/tests/{test_streak,test_dailies,test_profile}.py`
- Modify: `backend/accounts/serializers.py` (MeSerializer + streak), `backend/accounts/views.py` (`users/{id}/`), `backend/config/urls.py`

**Interfaces:**
- Consumes: `User`, `Task`, `AuthorSerializer`.
- Produces:
  - `dailies.models.Daily(author FK User CASCADE related_name="dailies", date DateField, done TextField, plans TextField(blank), blockers TextField(blank), tasks M2M Task blank related_name="dailies", created_at, updated_at)`, `UniqueConstraint(author, date)`, ordering `-date, -created_at`.
  - `dailies.streak.compute_streak(dates: set[date], today: date) -> int`
  - `dailies.streak.week_strip(dates: set[date], today: date) -> list[dict]` → 6 элементов пн–сб недели `today` (ISO, понедельник = `today - weekday`): `{"date": "YYYY-MM-DD", "has_daily": bool, "is_today": bool}`
  - `dailies.streak.streak_for(user) -> {"count": int, "week": [...]}` (берёт даты дейликов пользователя и `timezone.localdate()`)
  - `DailySerializer` → `{id, author: Author, date, done, plans, blockers, tasks: [{id,title,status}], task_ids (write-only), can_edit: bool, created_at}`; `date` read-only (= `localdate()`), `can_edit` = автор и `date == localdate()`.
  - `GET /api/dailies/?group=&author=&date=` — пагинация `PageNumberPagination`, `page_size=20`; `POST` — только student, 400 при втором за день; `PATCH/DELETE` — автор и только сегодня (иначе 403); `GET /api/dailies/today/` → мой сегодняшний или 404.
  - `MeSerializer` и `GET /api/users/{id}/` → `{...Me, streak: {count, week} | null}` (null для teacher).

Алгоритм стрика (тесты его не определяют полностью):

```python
def prev_study_day(d):  # шаг назад, пропуская воскресенье
    d -= timedelta(days=1)
    return d - timedelta(days=1) if d.weekday() == 6 else d

def compute_streak(dates, today):
    cur = today if today.weekday() != 6 else prev_study_day(today)
    if cur not in dates and cur == today:
        cur = prev_study_day(cur)          # сегодня ещё не писал — стрик не обнулён
    n = 0
    while cur in dates:
        n += 1; cur = prev_study_day(cur)
    return n
```

- [ ] **Step 1: Failing tests — стрик** (`test_streak.py`, 2026-11-27 — пятница):

```python
FRI = date(2026, 11, 27)
def test_streak_counts_consecutive_including_today():   assert compute_streak({FRI, FRI-1d, FRI-2d}, FRI) == 3
def test_streak_kept_when_today_missing():              assert compute_streak({FRI-1d, FRI-2d}, FRI) == 2
def test_streak_broken_by_missed_study_day():           assert compute_streak({FRI, FRI-2d}, FRI) == 1
def test_sunday_skipped():  # сб 21.11 и пн 23.11 подряд
    assert compute_streak({date(2026,11,21), date(2026,11,23)}, date(2026,11,23)) == 2
def test_on_sunday_counts_from_saturday():
    assert compute_streak({date(2026,11,28)}, date(2026,11,29)) == 1
def test_sunday_daily_not_counted():
    assert compute_streak({date(2026,11,29)}, date(2026,11,30)) == 0
def test_week_strip_mon_to_sat():
    w = week_strip({FRI}, FRI)
    assert [x["date"] for x in w][0] == "2026-11-23" and len(w) == 6
    assert w[4] == {"date": "2026-11-27", "has_daily": True, "is_today": True}
def test_week_strip_on_sunday_shows_ending_week():
    assert week_strip(set(), date(2026,11,29))[0]["date"] == "2026-11-23"
```

(`FRI-1d` — сокращение для `FRI - timedelta(days=1)`.)

- [ ] **Step 2: Failing tests — API** (`test_dailies.py`):

```python
def test_create_daily_today(auth, student): ...              # 201, date == localdate()
def test_second_daily_same_day_rejected(auth, student): ...   # 400
def test_teacher_cannot_create_daily(auth, teacher): ...      # 403
def test_daily_rejects_foreign_task(auth, student, student2): # task_ids=[task of student2] → 400
def test_cannot_edit_yesterdays_daily(auth, student):         # time_machine: создать, сдвинуть на +1 день → PATCH 403, can_edit False
def test_cannot_edit_foreign_daily(auth, student, student2): ...  # 403
def test_daily_date_uses_bishkek_midnight(auth, student):
    with time_machine.travel(datetime(2026,11,27,20,30, tzinfo=UTC), tick=False):
        assert auth(student).post("/api/dailies/", {"done": "x"}).data["date"] == "2026-11-28"
def test_feed_filtered_by_group_and_paginated(auth, ...): ...  # 25 дейликов → count 25, results 20
def test_today_endpoint_404_then_200(auth, student): ...
```

`test_profile.py`: `test_me_includes_streak_for_student`, `test_teacher_streak_is_null`, `test_user_profile_by_id`.

- [ ] **Step 3: Run** `.venv/bin/pytest dailies -q` → FAIL.
- [ ] **Step 4: Implement** модель, `streak.py`, сериализатор (валидация `task_ids ⊂ request.user.tasks`), `DailyViewSet` + `@action today`, профиль, admin.
- [ ] **Step 5: Run** `.venv/bin/pytest -q` → PASS (все приложения).
- [ ] **Step 6: Commit** `feat(backend): dailies, streak, profiles`

---

### Task 4: Backend — язык ошибок и демо-данные

**Files:**
- Create: `backend/locale/ky/LC_MESSAGES/django.po`, `backend/dailies/management/commands/seed_demo.py`, `backend/accounts/tests/test_locale.py`
- Modify: `backend/config/settings.py` (`LocaleMiddleware` после `SessionMiddleware`, `LOCALE_PATHS`, `LANGUAGES`)

**Interfaces:**
- Produces: `python manage.py seed_demo` — идемпотентно (пропускает, если пользователь `demo_teacher` есть): потоки «ИС-21», «ИС-22»; по 3 студента в каждом (логины `student1..6`, пароль `demo12345`), `demo_teacher` / `demo12345`; у каждого студента 4–6 задач по разным колонкам и дейлики за последние 5 учебных дней с привязанными карточками.

- [ ] **Step 1: Failing test** `test_locale.py`:

```python
@pytest.mark.parametrize("lang,needle", [("ru", "Обязательное поле"), ("en", "This field is required"), ("ky", <строка из своего .po>)])
def test_register_errors_follow_accept_language(api, lang, needle):
    r = api.post("/api/auth/register/", {}, HTTP_ACCEPT_LANGUAGE=lang)
    assert needle in str(r.data["username"][0])
```

Плюс `test_seed_demo_idempotent`: `call_command("seed_demo")` дважды → `User.objects.count()` не меняется после второго раза, 7 пользователей.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Сначала проверить, какие сообщения Django/DRF/simplejwt уже переведены на `ky` (`python -c "import django.utils.translation..."` / `gettext`). В `ky/django.po` добавить переводы только непереведённых: «This field is required.», «A user with that username already exists.», «No active account found with the given credentials», «Daily for today already exists.», «You can only edit today's daily.», «Unknown or foreign task.», ошибки валидатора паролей. Свои сообщения в коде — через `gettext_lazy`. `compilemessages` (нужен `gettext`: `apt-get install -y gettext`, если нет). Скомпилированный `.mo` коммитить.
- [ ] **Step 4: Run** `.venv/bin/pytest -q` → PASS.
- [ ] **Step 5: Commit** `feat(backend): localized errors, seed_demo`

---

### Task 5: Frontend — каркас, API-клиент, авторизация, тема, языки, лейаут

**Files:**
- Create: `frontend/*` (Vite react-ts), `src/api/{client,types,endpoints}.ts`, `src/api/client.test.ts`, `src/auth/*`, `src/i18n/*`, `src/theme/*`, `src/layout/{AppLayout,Sidebar,Topbar,Avatar,PillTabs}.tsx`, `src/pages/{Login,Register}.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: эндпоинты Task 1.
- Produces:
  - `api/types.ts`: `Role`, `TaskStatus = "todo"|"in_progress"|"done"`, `Author`, `Group`, `Me`, `Task`, `Daily`, `Streak {count, week: {date,has_daily,is_today}[]}`, `Paginated<T> {count,next,previous,results}`
  - `api/client.ts`: `export const api: AxiosInstance` (baseURL `/api`), `setTokens(access, refresh)`, `clearTokens()`, `onAuthLost(cb: () => void)`. Токены в `localStorage` (`sb-access`, `sb-refresh`). Request-интерцептор: `Authorization: Bearer`, `Accept-Language: i18n.language`. Response-интерцептор: на 401 (кроме `/auth/token*`) — один общий запрос refresh (параллельные 401 ждут его же промис), повтор исходного; если refresh упал — `clearTokens()` + `authLost`.
  - `api/endpoints.ts`: типизированные функции `login, register, getMe, getGroups, getGroupStudents, listTasks, createTask, updateTask, deleteTask, moveTask, listDailies, getTodayDaily, createDaily, updateDaily, deleteDaily, getUser`.
  - `auth/AuthContext.tsx`: `useAuth() → {me: Me|null, loading, login(u,p), register(data), logout(), refreshMe()}`; `RequireAuth` редиректит на `/login`.
  - `theme/ThemeContext.tsx`: `useTheme() → {theme, toggle()}`.
  - `layout/AppLayout` (сайдбар + топбар + `<Outlet/>`, проп-класс `wide` для доски); `Avatar({author})` — инициалы в кружке; `PillTabs({tabs:{key,label}[], value, onChange})` — вкладки-пилюли как на скриншоте.
  - Роуты: `/login`, `/register`, `/` (Home; teacher → redirect `/board`), `/board`, `/dailies`, `/users/:id`.
  - `vite.config.ts`: proxy `/api → http://localhost:8000`.

- [ ] **Step 1:** `npm create vite@latest frontend -- --template react-ts`, установить зависимости (axios, react-router-dom, i18next, react-i18next, @dnd-kit/core, @dnd-kit/sortable, lucide-react; dev: vitest, jsdom, axios-mock-adapter, @playwright/test той же версии, что предустановленный playwright).
- [ ] **Step 2: Failing test** `client.test.ts` (axios-mock-adapter):

```ts
test("401 refreshes once and retries", ...)       // GET /tasks/ 401 → POST /auth/token/refresh/ 200 → GET повторён, 200
test("parallel 401s share one refresh", ...)      // 2 запроса, refresh вызван 1 раз
test("failed refresh clears tokens and fires onAuthLost", ...)
test("sends Accept-Language from i18n", ...)      // i18n.changeLanguage("ky") → заголовок "ky"
```

- [ ] **Step 3: Run** `cd frontend && npx vitest run` → FAIL.
- [ ] **Step 4: Implement** клиент, endpoints, контексты, i18n (ресурсы из трёх JSON, `lng` из `localStorage` `sb-lang`, fallback `ru`), темы (`tokens.css`: значения тёмной темы снять со скриншотов `reference/*.webp` — фон ≈ `#242424`, сайдбар/топбар ≈ `#1b1b1b`, карточки ≈ `#2a2a2a`, акцент ≈ `#ff2d55`, success ≈ `#c6f31b`; светлая: фон `#f5f5f7`, карточки `#fff`, тот же акцент), лейаут (сайдбар: «Student Board», пункты по роли с lucide-иконками Home/LayoutGrid/PenLine/CircleUser; топбар справа: имя, переключатель темы Sun/Moon, `RU | EN | KY`, выход; < 768px — бургер), Login/Register (на регистрации — выбор роли и, для студента, потока из `GET /groups/`; ошибки сервера показываются у полей).
- [ ] **Step 5: Run** `npx vitest run && npx tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** `feat(frontend): scaffold, auth, theme, i18n, layout`

---

### Task 6: Frontend — доска

**Files:**
- Create: `src/pages/Board.tsx`, `src/board/{BoardColumns,TaskCard,TaskModal,ordering}.tsx|ts`, `src/board/ordering.test.ts`, `src/layout/{GroupSwitcher,StudentFilter}.tsx`

**Interfaces:**
- Consumes: `listTasks, createTask, updateTask, deleteTask, moveTask, getGroups, getGroupStudents`, `useAuth`.
- Produces:
  - `GroupSwitcher({value, onChange})`, `StudentFilter({groupId, value: number|null, onChange})` — переиспользуются в Task 7.
  - Выбранный поток хранится в query-параметре `?group=` (по умолчанию: свой у студента, первый у преподавателя); фильтр — `?student=`.
  - `board/ordering.ts`: `ownIndexAt(columnTasks: Task[], ownerId: number, overIndex: number): number` — сколько карточек этого владельца стоит в колонке до позиции `overIndex` (без самой перетаскиваемой) — это `position` для `moveTask`.
  - `BoardColumns({tasks, canEdit: (t)=>boolean, onMove(task, status, position), onOpen(task)})` — dnd-kit, перетаскивать можно только карточки, где `canEdit` true. Оптимистичное обновление, при ошибке — откат и перезагрузка списка.

- [ ] **Step 1: Failing test** `ordering.test.ts`: колонка `[A1, B1, A2, B2]` (A/B — владельцы), перетаскивание карточки A3 на индекс 3 → `ownIndexAt(..., A, 3) === 2`; на индекс 0 → 0; в пустую колонку → 0.
- [ ] **Step 2: Run** `npx vitest run src/board` → FAIL.
- [ ] **Step 3: Implement** страницу: переключатель потока + фильтр, три колонки с заголовками и счётчиками («Готово» — бейдж цвета `--success`), карточка (заголовок, Avatar + имя владельца → ссылка `/users/:id`), «+ Задача» в «Планирую» только студенту на своём потоке, `TaskModal` (просмотр для чужих; редактирование заголовка/описания/статуса и удаление с подтверждением для своих).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` → PASS; вручную: запустить оба сервера с `seed_demo`, перетащить карточку, перезагрузить — позиция сохранилась.
- [ ] **Step 5: Commit** `feat(frontend): kanban board`

---

### Task 7: Frontend — лента дейликов и форма

**Files:**
- Create: `src/pages/Dailies.tsx`, `src/dailies/{DailyItem,DailyForm}.tsx`

**Interfaces:**
- Consumes: `listDailies, getTodayDaily, createDaily, updateDaily, deleteDaily, listTasks`, `GroupSwitcher`, `StudentFilter`.
- Produces: `DailyItem({daily})` (используется в Home и Profile); `DailyForm({initial?: Daily, onSaved(d: Daily)})` — поля «Что сделал» (обязательно), «Что планирую», «Что мешает», мультивыбор своих карточек (чипы из `listTasks({owner: me.id})`).

- [ ] **Step 1:** Implement ленту: те же переключатели, что на доске; элемент — Avatar, имя (ссылка), дата локализованная (`Intl.DateTimeFormat(i18n.language)`; для `ky` проверить, что формат не падает), три блока (пустые не показываются), чипы карточек; «Показать ещё» по `next`. Студенту наверху: «Написать дейлик» либо «Редактировать сегодняшний» (по `getTodayDaily`). `can_edit` → кнопки «Изменить/Удалить».
- [ ] **Step 2: Run** `npx tsc --noEmit` → PASS; вручную: написать дейлик, второй — кнопка сменилась на «Редактировать», ошибки сервера видны в форме.
- [ ] **Step 3: Commit** `feat(frontend): dailies feed and form`

---

### Task 8: Frontend — главная и профиль

**Files:**
- Create: `src/pages/{Home,Profile}.tsx`, `src/dailies/StreakCard.tsx`

**Interfaces:**
- Consumes: `getMe/useAuth`, `getUser`, `listTasks`, `listDailies`, `DailyItem`, `BoardColumns`, `PillTabs`, `Avatar`.
- Produces: `StreakCard({streak: Streak, onWrite?: () => void})` — как блок стрика на скриншоте `lms-home.webp`: огонёк + «N дней подряд» (плюрализация i18next для ru/ky/en), подпись, шесть дней пн–сб с огоньками (горит при `has_daily`, сегодня — красная подпись), «сегодня, 27 ноября», кнопка «Написать дейлик», если сегодня дейлика нет.

- [ ] **Step 1:** Home: шапка (Avatar, ФИО, поток), `StreakCard`, «Мои задачи в работе» (`status=in_progress`, стрелка → `/board?student=me`), «Свежие дейлики потока» (5 шт., стрелка → `/dailies`), пустые состояния («пока пусто»). Profile `/users/:id`: шапка + стрик (если студент), `PillTabs` «Доска / Дейлики» с доской только этого студента и его дейликами.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx vitest run` → PASS.
- [ ] **Step 3: Commit** `feat(frontend): home and profile`

---

### Task 9: Визуальная сверка, smoke-тест, README

**Files:**
- Create: `frontend/playwright.config.ts`, `frontend/e2e/smoke.spec.ts`, `README.md`

- [ ] **Step 1: Smoke e2e** (`webServer` в конфиге поднимает `backend` на свежей БД `migrate && seed_demo && runserver` и `vite`): вход `student1` → главная видна; создать задачу, перетащить в «В работе»; написать дейлик → стрик ≥ 1; переключить язык на KY и тему на светлую — после перезагрузки сохранились; вход `demo_teacher` → нет кнопки «+ Задача», переключение потока меняет карточки.
- [ ] **Step 2: Run** `npx playwright test --trace off` → PASS.
- [ ] **Step 3: Визуальная сверка.** Скриншоты главной и доски в тёмной/светлой теме и на ru/en/ky (scale 1); сравнить тёмную главную с `reference/lms-home.webp` (отступы, размеры шрифтов, радиусы, цвета) и поправить CSS. Проверить: нет непереведённых строк (поиск по коду литералов кириллицы вне `i18n/*.json`), длинные кыргызские подписи не ломают сайдбар, длинный заголовок карточки переносится.
- [ ] **Step 4: README**: требования, запуск бэка (`venv`, `pip install`, `migrate`, `createsuperuser`, `seed_demo`, `runserver`), фронта (`npm i`, `npm run dev`), как добавить поток в админке, тесты (`pytest`, `vitest`, `playwright`), примечание «кыргызский перевод стоит вычитать носителю».
- [ ] **Step 5: Commit** `test: e2e smoke; docs: README; style: visual pass`
