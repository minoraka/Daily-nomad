# Jira-style Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Преподаватель назначает задачи студентам и принимает их через «На проверке»; карточки и доска выглядят как Jira в стиле LMS; поиск, быстрые фильтры, комментарии.

**Architecture:** Расширяем существующую модель `board.Task` (поля + статус `review`) и добавляем `board.Comment`. Все правила доступа собраны в одном модуле `board/policy.py` и зеркально в `frontend/src/board/policy.ts`, их используют и API, и UI. Доска остаётся на `dnd-kit` с существующей логикой позиций по владельцу.

**Tech Stack:** как в проекте: Django 5 + DRF + simplejwt, pytest-django, time-machine; React 19 + Vite + TS, react-i18next, dnd-kit, lucide-react, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-28-jira-board-design.md` (базовый: `2026-11-27-student-board-design.md`; референсы: `docs/superpowers/specs/reference/jira-board.webp`, `lms-*.webp`)

## Global Constraints

- Статусы и порядок колонок: `todo, in_progress, review, done`; подписи ru/en/ky: «Планирую/Planned/Пландалган», «В работе/In progress/Аткарылууда», «На проверке/In review/Текшерүүдө», «Готово/Done/Даяр».
- Приоритеты: `low | medium | high | critical`, по умолчанию `medium`. Оценка: `null` или одно из `1, 2, 3, 5, 8`.
- Метки: ≤ 5, каждая 1–24 символа после trim, дубликаты без учёта регистра убираются (остаётся первое написание).
- Номер задачи: `SB-{id}`. Комментарий: 1–2000 символов после trim.
- `is_overdue` = `deadline < timezone.localdate()` (Asia/Bishkek) и `status != done`.
- «Задача преподавателя» = `created_by.role == "teacher"`; «личная» = `created_by_id == owner_id`.
- Права — строго по таблице в спецификации (раздел «Права»), включая: исполнитель задачи преподавателя не может в `done`, из `done` и внутри `done` (403), ни через `move`, ни через `PATCH status`.
- Стиль только через существующие CSS-переменные LMS; никаких синих цветов Jira.
- Каждая новая строка UI — во всех трёх `ru/en/ky.json` (тест паритета ключей уже есть).
- Существующие тесты (55 backend, 22 vitest, 4 e2e) остаются зелёными.

## Review Focus

1. **Назначение потоку без студентов** — 400 с понятной ошибкой, а не пустой 201. → `test_assign_to_empty_group_400` в Task 2.
2. **Обход через PATCH:** студент шлёт `PATCH {status: "done"}` на задачу преподавателя → 403, статус не меняется. → `test_student_cannot_patch_teacher_task_to_done` в Task 2.
3. **Грязные метки:** `["  ", "Frontend", "frontend", "x"*30]` → 400 на длинной; пробельные отбрасываются, дубликат схлопывается. → `test_labels_normalized_and_validated` в Task 1.
4. **Отмена диалога «Вернуть в работу»** — запроса `move` нет, карточка остаётся в исходной колонке. → `useTaskBoard.test.tsx::cancelled return does not move` в Task 6.
5. **Комментарий студента к чужой личной задаче** → 403; преподаватель к той же — 201. → `test_comment_permissions` в Task 3.

---

## File Structure

```
backend/board/
  models.py            Task: + created_by, priority, estimate, deadline, labels, batch, status review; Comment
  migrations/0002_*.py поля + data-migration created_by = owner
  policy.py            NEW: is_teacher_task, can_edit_fields, can_move, can_delete, can_comment
  serializers.py       новые поля, валидация, AssignSerializer, CommentSerializer
  views.py             права через policy, action assign, comments
  tests/test_fields.py, test_policy.py, test_assign.py, test_comments.py   NEW
backend/dailies/management/commands/seed_demo.py   + задачи преподавателя, комментарии
backend/locale/{ru,ky}/LC_MESSAGES/django.po       + новые сообщения
frontend/src/api/{types,endpoints}.ts              новые поля, assignTasks, comments
frontend/src/board/
  policy.ts            NEW: зеркало backend policy (canDrag, canDropTo, canEditFields, canComment, isBackward)
  labels.ts            NEW: labelColor(text) -> CSS class
  filters.ts           NEW: filterTasks(tasks, {query, quick}, me)
  TaskCard.tsx         редизайн карточки
  BoardColumns.tsx     4 колонки, Jira-заголовки, запрет дропа
  BoardToolbar.tsx     NEW: поиск + быстрые фильтры
  TaskDetail.tsx       NEW: подробная модалка (заменяет просмотр/редакт в TaskModal)
  TaskForm.tsx         NEW: создание личной задачи / назначение (заменяет TaskModal create)
  ReturnDialog.tsx     NEW: «Вернуть в работу» + комментарий
  Comments.tsx         NEW
  useTaskBoard.ts      + запрет дропа, диалог возврата
  TaskModal.tsx        удаляется (Modal переезжает в layout/Modal.tsx)
frontend/src/dailies/{DailyItem,DailyForm}.tsx      номер задачи в чипах
frontend/e2e/assign.spec.ts                         NEW
```

---

### Task 1: Backend — новые поля задачи и сериализация

**Files:**
- Modify: `backend/board/models.py`, `backend/board/serializers.py`, `backend/board/views.py` (только `perform_create` + `queryset`), `backend/board/admin.py`
- Create: `backend/board/migrations/0002_jira_fields.py` (makemigrations + RunPython), `backend/board/tests/test_fields.py`

**Interfaces:**
- Produces:
  - `Task.Status.REVIEW = "review"`; choices в порядке todo, in_progress, review, done.
  - `Task.Priority` TextChoices `low/medium/high/critical`.
  - `Task.created_by: FK(User, PROTECT, related_name="created_tasks")`, `priority`, `estimate: PositiveSmallIntegerField(null)`, `deadline: DateField(null)`, `labels: JSONField(default=list)`, `batch: UUIDField(null)`.
  - `Task.key` (property → `"SB-{id}"`), `Task.from_teacher` (property).
  - `board.serializers.normalize_labels(value: list) -> list[str]` (raises `ValidationError`).
  - `TaskSerializer` поля: `id, key, owner, created_by, from_teacher, title, description, status, position, priority, estimate, deadline, labels, is_overdue, comments_count, created_at, updated_at`; `created_by` = Author + `role`; `comments_count` из `annotate(Count("comments"))` в queryset (до Task 3 — `0`, через `getattr(obj, "comments_count", 0)`).
  - Comment-модель появляется в Task 3; в этой задаче queryset annotate не делается.

- [ ] **Step 1: Failing tests** `test_fields.py`:

```python
def test_create_with_new_fields(auth, student):
    r = auth(student).post("/api/tasks/", {"title": "A", "priority": "high", "estimate": 3,
        "deadline": "2026-12-05", "labels": ["Frontend"]}, format="json")
    assert r.status_code == 201
    assert r.data["key"] == f"SB-{r.data['id']}" and r.data["priority"] == "high"
    assert r.data["from_teacher"] is False and r.data["created_by"]["id"] == student.id

def test_defaults(auth, student):  # priority medium, estimate None, labels [], deadline None

@pytest.mark.parametrize("est", [4, 0, 13])
def test_estimate_must_be_fibonacci(auth, student, est):  # 400

def test_labels_normalized_and_validated(auth, student):
    c = auth(student)
    r = c.post("/api/tasks/", {"title": "A", "labels": ["  ", "Frontend", "frontend", " API "]}, format="json")
    assert r.data["labels"] == ["Frontend", "API"]
    assert c.post("/api/tasks/", {"title": "A", "labels": ["x" * 25]}, format="json").status_code == 400
    assert c.post("/api/tasks/", {"title": "A", "labels": list("abcdef")}, format="json").status_code == 400

def test_is_overdue_uses_bishkek_date(auth, student):
    # deadline 2026-11-27; at 2026-11-27T20:30Z (already 28th in Bishkek) → True; at 2026-11-27T06:00Z → False
    # done task with past deadline → False

def test_review_status_move(auth, student):  # move own task to "review" → 200
```

Data-migration проверяется вручную в шаге 5 (отдельного пакета для тестов миграций в проекте нет).

- [ ] **Step 2: Run** `cd backend && .venv/bin/pytest board -q` → FAIL.
- [ ] **Step 3: Implement.** Миграция в 3 операции: `AddField created_by null=True` → `RunPython(lambda: Task.objects.update(created_by=F("owner")))` → `AlterField created_by null=False`. Обновить фикстуры и хелпер `mk()` в `board/tests/test_tasks.py` (`created_by=user`), `perform_create` ставит `created_by=request.user`. Обновить `seed_demo` (`created_by=user`) — иначе он упадёт.
- [ ] **Step 4: Run** `.venv/bin/pytest -q` → все PASS.
- [ ] **Step 5: Ручная проверка миграции**: в отдельном `git worktree` на `main` создать БД (`SQLITE_PATH=<scratch>/old.sqlite3 migrate && seed_demo`), затем в ветке `SQLITE_PATH=<scratch>/old.sqlite3 migrate`. Expected: миграции применились, `Task.objects.filter(created_by_id=F("owner_id")).count() == Task.objects.count()`.
- [ ] **Step 6: Commit** `feat(board): priority, estimate, deadline, labels, review status, created_by`

---

### Task 2: Backend — правила доступа и назначение задач

**Files:**
- Create: `backend/board/policy.py`, `backend/board/tests/test_policy.py`, `backend/board/tests/test_assign.py`
- Modify: `backend/board/views.py`, `backend/board/serializers.py`, `backend/common/permissions.py` (`StudentCanCreate` не используется для задач)

**Interfaces:**
- Consumes: Task 1 поля.
- Produces (`board/policy.py`, все функции чистые, принимают `user, task`):
  - `is_teacher_task(task) -> bool`
  - `can_edit_fields(user, task) -> bool` — личная: `user == owner`; преподавателя: `user.role == teacher`.
  - `can_move(user, task, to_status: str) -> bool` — личная: `user == owner`; преподавателя: teacher → True; owner → `task.status != "done" and to_status != "done"`; иначе False.
  - `can_delete(user, task) -> bool` = `can_edit_fields`.
  - `can_comment(user, task) -> bool` — `user == owner or user.role == teacher`.
  - `TaskPermission(BasePermission)` в `board/views.py`: SAFE → True; `update/partial_update` → `can_edit_fields` для полей кроме `status`, и `can_move(user, task, new_status)` если статус меняется (студент-исполнитель задачи преподавателя может слать `PATCH {status}` в разрешённые колонки, но не поля); `destroy` → `can_delete`; `move` → `can_move` с `status` из тела.
  - `POST /api/tasks/assign/` (`@action(detail=False, methods=["post"])`), `AssignSerializer`: поля задачи + `assignees: ListField(child=IntegerField, required=False)`, `group: IntegerField(required=False)`; ровно одно из двух. Ответ 201 `TaskSerializer(many=True)`. Только teacher (403 иначе). Ошибки 400: оба/ни одного, id не студенты/не существуют, в потоке нет студентов. Каждая копия: `status=todo`, позиция в конце колонки владельца, общий `batch=uuid4()`, `created_by=request.user`.
  - `POST /api/tasks/` (личная) — только student, как раньше.

- [ ] **Step 1: Failing tests** `test_policy.py` (через API, фикстуры `teacher`, `student`, `student2`; хелпер `teacher_task(owner, status="todo")` создаёт задачу с `created_by=teacher`):

```python
@pytest.mark.parametrize("frm,to,code", [("todo","in_progress",200), ("in_progress","review",200),
    ("review","in_progress",200), ("review","done",403), ("done","review",403), ("done","done",403)])
def test_assignee_moves_teacher_task(auth, student, teacher, frm, to, code): ...

def test_student_cannot_patch_teacher_task_to_done(auth, student, teacher):
    # PATCH {status: "done"} → 403; refresh → status unchanged
def test_student_can_patch_teacher_task_status_to_review(...)  # 200
def test_student_cannot_edit_teacher_task_fields(...)  # PATCH {title} → 403; DELETE → 403
def test_teacher_edits_moves_deletes_teacher_task(...)  # any teacher (second teacher fixture `teacher2`) → 200/200/204
def test_teacher_cannot_touch_personal_task(...)  # PATCH/move/DELETE → 403
def test_other_student_cannot_move_teacher_task(...)  # student2 → 403
```

`test_assign.py`:

```python
def test_assign_to_students(auth, teacher, student, student2):
    r = auth(teacher).post("/api/tasks/assign/", {"title": "ДЗ 1", "assignees": [student.id, student2.id],
        "deadline": "2026-12-01", "priority": "high"}, format="json")
    assert r.status_code == 201 and len(r.data) == 2
    assert {t["owner"]["id"] for t in r.data} == {student.id, student2.id}
    assert all(t["from_teacher"] and t["status"] == "todo" for t in r.data)
    assert Task.objects.filter(title="ДЗ 1").values("batch").distinct().count() == 1
def test_assign_to_group(auth, teacher, group, student, student2, other_group_student): ...  # 2 tasks, not other group
def test_assign_appends_to_end_of_todo(...)  # student already has todo at 0 → new position 1
def test_assign_to_empty_group_400(auth, teacher, db):  # Group with no students → 400
def test_assign_requires_exactly_one_target(...)  # both / none → 400
def test_assign_rejects_teacher_or_missing_ids(...)  # assignees=[teacher.id] / [999] → 400
def test_student_cannot_assign(auth, student, group)  # 403
def test_teacher_cannot_create_personal_task(auth, teacher)  # POST /tasks/ → 403 (unchanged)
```

Добавить фикстуру `teacher2` в `conftest.py`.

- [ ] **Step 2: Run** `.venv/bin/pytest board -q` → FAIL.
- [ ] **Step 3: Implement** `policy.py`, `TaskPermission`, `assign`. Существующий `IsOwnerOrReadOnly` для задач заменить на `TaskPermission` (для дейликов он остаётся).
- [ ] **Step 4: Run** `.venv/bin/pytest -q` → PASS (включая старые `test_tasks.py`).
- [ ] **Step 5: Commit** `feat(board): teacher assignments and review workflow permissions`

---

### Task 3: Backend — комментарии, демо-данные, переводы

**Files:**
- Modify: `backend/board/models.py` (+`Comment`), `serializers.py`, `views.py`, `urls.py`, `admin.py`, `backend/dailies/management/commands/seed_demo.py`, `backend/locale/{ru,ky}/LC_MESSAGES/django.po` (+`.mo`)
- Create: `backend/board/migrations/0003_comment.py`, `backend/board/tests/test_comments.py`

**Interfaces:**
- Produces:
  - `Comment(task FK CASCADE related_name="comments", author FK User CASCADE, text TextField, created_at auto_now_add)`, ordering `created_at, id`.
  - `CommentSerializer` → `{id, task, author: Author + role, text, created_at, can_delete}`; `text` trim, 1–2000.
  - `GET/POST /api/tasks/{id}/comments/` (`@action(detail=True, methods=["get","post"], url_path="comments")`), POST — `can_comment` иначе 403.
  - `DELETE /api/comments/{id}/` (`CommentViewSet` только destroy) — автор, иначе 403.
  - `TaskViewSet.queryset` → `.select_related("owner", "created_by").annotate(comments_count=Count("comments"))`.

- [ ] **Step 1: Failing tests** `test_comments.py`:

```python
def test_comment_permissions(auth, student, student2, teacher):
    own = personal(student)  # created_by = owner = student
    assert auth(student).post(f"/api/tasks/{own.id}/comments/", {"text": "hi"}).status_code == 201
    assert auth(student2).post(f"/api/tasks/{own.id}/comments/", {"text": "hi"}).status_code == 403
    assert auth(teacher).post(f"/api/tasks/{own.id}/comments/", {"text": "hi"}).status_code == 201
def test_comments_listed_in_order_and_counted(...)  # GET order; task list shows comments_count == 2
def test_blank_or_long_comment_400(...)  # "   " → 400; "x"*2001 → 400
def test_only_author_deletes_comment(...)  # other → 403, author → 204, can_delete flags
def test_anyone_logged_in_can_read_comments(...)  # student2 GET → 200
```

Плюс в `accounts/tests/test_locale.py`: `test_seed_demo_idempotent` остаётся (7 пользователей) и новый `test_seed_has_teacher_tasks`: после `seed_demo` есть ≥ 3 задачи `created_by=demo_teacher`, из них одна `review`, одна просроченная (`deadline < localdate`, не done), ≥ 2 комментария.

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Сид: для ИС-21 — назначения «Лабораторная 1: модели» (deadline сегодня−3, priority high, labels ["Backend"], у student1 — в `review` с комментарием студента «Готово, проверьте»), «Свёрстать профиль» (deadline сегодня+5, labels ["Frontend"], у student2 — комментарий преподавателя «Не забудь адаптив»), «Презентация проекта» (deadline сегодня+10, priority critical, estimate 5). Части личных задач — приоритеты/метки. Переводы ru/ky для новых серверных сообщений (`Choose either assignees or group.`, `No students in this group.`, `Only students can be assignees.`, `Allowed estimates: 1, 2, 3, 5, 8.`, `At most 5 labels.`, `Label is too long (max 24).`, `Only the teacher can accept the task.`), скомпилировать `msgfmt`.
- [ ] **Step 4: Run** `.venv/bin/pytest -q` → PASS.
- [ ] **Step 5: Commit** `feat(board): task comments; seed teacher tasks; translations`

---

### Task 4: Frontend — данные, правила, новая карточка и 4 колонки

**Files:**
- Modify: `frontend/src/api/types.ts`, `api/endpoints.ts`, `board/TaskCard.tsx`, `board/BoardColumns.tsx`, `board/ordering.ts` (статусы из `STATUSES`), `theme/base.css`, `i18n/{ru,en,ky}.json`
- Create: `board/policy.ts`, `board/policy.test.ts`, `board/labels.ts`, `board/labels.test.ts`

**Interfaces:**
- Consumes: API Task 1–3.
- Produces:
  - `types.ts`: `TaskStatus` + `"review"`, `STATUSES = ['todo','in_progress','review','done']`, `Priority = 'low'|'medium'|'high'|'critical'`, `Task` + `key, created_by: Author & {role: Role}, from_teacher, priority, estimate: number|null, deadline: string|null, labels: string[], is_overdue, comments_count`, `Comment {id, task, author: Author & {role}, text, created_at, can_delete}`, `TaskInput` (title, description, priority, estimate, deadline, labels), `AssignInput = TaskInput & ({assignees: number[]} | {group: number})`.
  - `endpoints.ts`: `assignTasks(data: AssignInput): Promise<Task[]>`, `listComments(taskId): Promise<Comment[]>`, `addComment(taskId, text): Promise<Comment>`, `deleteComment(id)`; `createTask/updateTask` принимают `Partial<TaskInput & {status}>`.
  - `policy.ts` (зеркало backend, на `Me`): `isTeacherTask(t)`, `canEditFields(me, t)`, `canMove(me, t, to: TaskStatus)`, `canDrag(me, t)` = `canMove` хотя бы в одну колонку (для исполнителя задачи преподавателя в done → false), `canComment(me, t)`, `isBackward(from, to)` (индекс `to` < индекса `from` в `STATUSES`).
  - `labels.ts`: `labelColor(text: string): string` → один из `label-c0 … label-c7` (хэш по `text.toLowerCase()`).
  - `TaskCard` показывает всё из спецификации «Карточка»; иконки приоритета `ChevronsUp/ChevronUp/Equal/ChevronDown`; `GraduationCap` у задач преподавателя с `title={t('board.from_teacher_by', {name})}`; `MessageSquare` + число если `comments_count > 0`; `CalendarDays` + дата (`formatDay` без года) красным при `is_overdue`.
  - `BoardColumns` props: `tasks, me, onDrop, onOpen, onAdd?, showOwner?` (вместо `canEdit`); заголовок колонки — `«НАЗВАНИЕ» N` текстом (без бейджа), Jira-стиль; `useSortable({disabled: !canDrag(me, t)})`.

- [ ] **Step 1: Failing tests** `policy.test.ts`:

```ts
test('assignee cannot drop teacher task into done', () => expect(canMove(student, teacherTask('review'), 'done')).toBe(false))
test('assignee can move teacher task to review', ...)            // true
test('assignee cannot drag accepted teacher task', ...)         // canDrag(student, teacherTask('done')) === false
test('teacher can move teacher task anywhere, not personal', ...)
test('other student cannot drag', ...)
test('isBackward', () => { expect(isBackward('review','in_progress')).toBe(true); expect(isBackward('todo','review')).toBe(false) })
```

`labels.test.ts`: `labelColor('Frontend') === labelColor('frontend')`; результат матчит `/^label-c[0-7]$/`; у `['a','b','c','d','e','f','g','h','i']` минимум 4 разных цвета.

- [ ] **Step 2: Run** `cd frontend && npx vitest run src/board` → FAIL.
- [ ] **Step 3: Implement.** CSS: `.label-c0…c7` (фон с прозрачностью + текст, читаемые в обеих темах), карточка: белый/`--surface-3` фон, тень, 12px паддинги, футер `display:flex` с `margin-left:auto` у номера; колонки: фон `--surface`, заголовок 11px капс `--text-muted`; сетка `repeat(4, minmax(220px, 1fr))` с горизонтальным скроллом на узких экранах (< 900px — одна колонка лентой, как сейчас). Переводы: `status.review`, `priority.{low,medium,high,critical}`, `board.from_teacher_by`, `board.estimate`, `board.deadline`, `board.labels`, `board.comments`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc -p tsconfig.app.json --noEmit` → PASS.
- [ ] **Step 5: Commit** `feat(frontend): Jira-style cards, 4 columns, client policy`

---

### Task 5: Frontend — поиск, быстрые фильтры, создание и назначение

**Files:**
- Create: `board/filters.ts`, `board/filters.test.ts`, `board/BoardToolbar.tsx`, `board/TaskForm.tsx`, `layout/Modal.tsx`
- Modify: `pages/Board.tsx`, `pages/Profile.tsx`, i18n

**Interfaces:**
- Produces:
  - `filters.ts`: `type Quick = 'mine' | 'teacher' | 'overdue' | 'review'`; `matchesQuery(t: Task, q: string): boolean` (подстрока названия без регистра; номер: `q` после удаления `sb`, `-`, пробелов — цифры, равные `t.id`); `filterTasks(tasks: Task[], opts: {query: string; quick: Set<Quick>}, me: Me): Task[]` (И между фильтрами; `mine` у студента `owner.id === me.id`, у преподавателя = `from_teacher`).
  - `BoardToolbar({query, onQuery, quick, onQuick, isTeacher})` — для преподавателя пилюли без `mine`.
  - `layout/Modal.tsx`: `Modal({children, onClose, wide?})` (переносится из `TaskModal.tsx`).
  - `TaskForm({mode: 'personal' | 'assign', groupId: number|null, onClose, onSaved(count: number)})`: поля из `TaskInput`; метки — ввод через Enter/запятую в чипы; при `assign` — переключатель «Весь поток» / «Выбрать студентов» (чипы из `getGroupStudents(groupId)`); сабмит → `createTask` или `assignTasks`; ошибки полей как в остальных формах.
  - `Board.tsx`: кнопка «+ Задача» — студенту на своём потоке (`personal`), преподавателю всегда (`assign`); после назначения строка «Назначено N студентам» (`board.assigned`, plural).

- [ ] **Step 1: Failing tests** `filters.test.ts`:

```ts
test('query by title is case-insensitive', ...)
test.each(['SB-25', 'sb25', 'sb 25', '25'])('query %s finds key SB-25', ...)
test('quick filters combine with AND', ...)  // overdue+teacher → only overdue teacher task
test('mine for teacher means from_teacher', ...)
test('empty opts returns all', ...)
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Счётчики колонок считаются по отфильтрованным задачам (фильтрация до `BoardColumns`). Состояние поиска/фильтров — в `useState` страницы (не в URL). В `Profile.tsx` — тот же `BoardColumns` с новыми props, без тулбара.
- [ ] **Step 4: Run** `npx vitest run && npx tsc -p tsconfig.app.json --noEmit` → PASS.
- [ ] **Step 5: Commit** `feat(frontend): board search, quick filters, task creation and assignment`

---

### Task 6: Frontend — подробная карточка, комментарии, возврат в работу

**Files:**
- Create: `board/TaskDetail.tsx`, `board/Comments.tsx`, `board/ReturnDialog.tsx`
- Modify: `board/useTaskBoard.ts`, `board/useTaskBoard.test.tsx`, `pages/Board.tsx`, `pages/Profile.tsx`, `dailies/DailyItem.tsx`, `dailies/DailyForm.tsx`, i18n
- Delete: `board/TaskModal.tsx`

**Interfaces:**
- Consumes: `policy.ts`, `Modal`, comments endpoints.
- Produces:
  - `useTaskBoard(query)` возвращает дополнительно `pendingReturn: {task: Task; overId: string} | null`, `confirmReturn(comment: string): Promise<void>`, `cancelReturn(): void`, `notice: string | null`. `onDrop(task, overId, me)`: вычислить `drop = computeDrop(...)`; если `!canMove(me, task, drop.status)` → `notice = t('board.only_teacher_accepts')`, без запроса; если `me.role === 'teacher' && isBackward(task.status, drop.status)` → `pendingReturn` и ждать; иначе как сейчас.
  - `confirmReturn(text)`: если `text.trim()` → `addComment` затем `moveTask`; потом `reload`.
  - `ReturnDialog({onConfirm(text), onCancel})`.
  - `TaskDetail({task, me, onClose, onChanged})`: раскладка из спецификации («Подробная карточка»); поля редактируются при `canEditFields`, сохранение кнопкой «Сохранить»; селект статуса — только допустимые по `canMove`, назад для преподавателя открывает `ReturnDialog`; преподавателю на `review` — кнопки «Принять» (`moveTask(id, 'done', 9999)` — сервер клампит позицию в конец колонки) и «Вернуть в работу»; удаление по `canDelete`.
  - `Comments({task, me, onCountChange})`: список (`Avatar`, ФИО, `role` бейдж для преподавателя, время: сегодня → `HH:MM`, иначе `formatDay` + `HH:MM`), поле ввода и «Отправить» при `canComment`, «Удалить» при `can_delete`.
  - Дейлики: чипы `{key} {title}` — `DailyItem` берёт `key` из `daily.tasks[]` (бэкенд `DailyTaskSerializer` + поле `key`), `DailyForm` — из `Task.key`.

- [ ] **Step 1: Failing tests** в `useTaskBoard.test.tsx` (моки endpoints, `me` передаётся в `onDrop`):

```ts
test('student drop of teacher task into done is blocked without request', ...)  // moveTask not called, notice set
test('teacher backward drop opens return dialog', ...)                         // pendingReturn set, moveTask not called
test('confirmReturn with text adds comment then moves', ...)                   // call order: addComment, moveTask
test('cancelled return does not move', ...)                                    // cancelReturn → moveTask not called, pendingReturn null
```

Плюс backend: `dailies/tests/test_dailies.py::test_daily_task_chip_has_key` (`tasks[0]["key"] == f"SB-{t.id}"`).

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** компоненты; `TaskModal.tsx` удалить, импорты перевести на `TaskDetail`/`TaskForm`/`layout/Modal`. Переводы: `board.accept`, `board.return`, `board.return_title`, `board.return_comment`, `board.only_teacher_accepts`, `board.personal`, `board.assignee`, `board.author`, `comments.*` (title, placeholder, send, delete, empty).
- [ ] **Step 4: Run** `npx vitest run && npx tsc -p tsconfig.app.json --noEmit && (cd ../backend && .venv/bin/pytest -q)` → PASS.
- [ ] **Step 5: Commit** `feat(frontend): task detail with comments, review accept/return flow`

---

### Task 7: E2E, визуальная сверка, документация

**Files:**
- Create: `frontend/e2e/assign.spec.ts`
- Modify: `frontend/e2e/smoke.spec.ts` (если селекторы колонок/кнопок изменились), `README.md`, `ЗАПУСК.md`

- [ ] **Step 1: E2E** `assign.spec.ts` (один тест, два `browser.newContext()`):
  1. `demo_teacher` → Доска → «+ Задача» → название «E2E лаба», «Весь поток» (ИС-21) → «Назначено 3 студентам».
  2. `student1` → карточка «E2E лаба» в «Планирую» с иконкой преподавателя; перетаскивание в «Готово» → карточка не в «Готово», видна подсказка; перетаскивание в «На проверке» → после reload в «На проверке».
  3. Преподаватель → открыть карточку → «Вернуть в работу» с текстом «Добавь тесты» → карточка в «В работе».
  4. Студент → открыть карточку → комментарий «Добавь тесты» виден → статус «На проверке».
  5. Преподаватель → «Принять» → в «Готово»; у студента карточка в «Готово» не перетаскивается (`aria-disabled`/нет класса `draggable`).
  Плюс: поиск `SB-<id>` оставляет одну карточку; фильтр «Просроченные» показывает сидовую просроченную задачу.
- [ ] **Step 2: Run** `npx playwright test --trace off` → PASS (старые 4 + новый).
- [ ] **Step 3: Визуальная сверка.** Скриншоты доски (тёмная/светлая, ru/ky, 1440px и iPhone 13) и подробной карточки; сравнить раскладку с `reference/jira-board.webp`, стиль — с `lms-home.webp`; поправить CSS. Проверить: длинное название и 5 меток не ломают карточку; кыргызские подписи колонок и фильтров влезают.
- [ ] **Step 4: Docs.** README: раздел «Rules» — новые правила; ЗАПУСК.md: демо-сценарий «войдите как demo_teacher, назначьте задачу; войдите как student1…».
- [ ] **Step 5: Commit** `test: e2e assignment flow; docs`
