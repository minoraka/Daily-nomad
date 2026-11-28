import uuid

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Group, User
from datetime import timedelta

from board.models import Comment, Task
from dailies.models import Daily
from dailies.streak import prev_study_day

PASSWORD = "demo12345"

STUDENTS = [
    ("student1", "Аня", "Иванова", "ИС-21"),
    ("student2", "Петя", "Сидоров", "ИС-21"),
    ("student3", "Айгерим", "Касымова", "ИС-21"),
    ("student4", "Бекзат", "Токтогулов", "ИС-22"),
    ("student5", "Мария", "Ким", "ИС-22"),
    ("student6", "Тимур", "Осмонов", "ИС-22"),
]

TASKS = [
    ("Модели БД для блога", "done"),
    ("Регистрация и вход по JWT", "in_progress"),
    ("Свёрстать главную страницу", "in_progress"),
    ("Написать тесты для API", "todo"),
    ("Задеплоить на сервер", "todo"),
    ("Разобраться с CORS", "done"),
]

DAILY_TEXTS = [
    ("Разобрался с моделями и миграциями.", "Начать авторизацию.", ""),
    ("Сделал эндпоинт регистрации.", "Добавить JWT refresh.", "Не понимаю, где хранить токен."),
    ("Починил CORS между фронтом и бэком.", "Сверстать главную.", ""),
    ("Свёрстал шапку и боковое меню.", "Доделать карточки.", "Плывёт вёрстка на телефоне."),
    ("Написал первые тесты.", "Покрыть тестами дейлики.", ""),
]


LABELS = {
    "Модели БД для блога": ["Backend"],
    "Регистрация и вход по JWT": ["Backend", "Auth"],
    "Свёрстать главную страницу": ["Frontend"],
    "Написать тесты для API": ["Tests"],
    "Задеплоить на сервер": ["DevOps"],
}
PRIORITIES = ["medium", "high", "low", "medium", "critical"]

# (title, description, priority, estimate, deadline offset in days, labels)
TEACHER_TASKS = [
    ("Лабораторная 1: модели", "Опишите модели блога и сделайте миграции.", "high", 3, -3, ["Backend"]),
    ("Свёрстать профиль", "Страница профиля по макету, с адаптивом.", "medium", 2, 5, ["Frontend"]),
    ("Презентация проекта", "10 слайдов: цель, стек, демо, выводы.", "critical", 5, 10, ["Защита"]),
]


class Command(BaseCommand):
    help = "Create demo groups, users, tasks and dailies (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        if User.objects.filter(username="demo_teacher").exists():
            self.stdout.write("Demo data already exists — skipping.")
            return
        groups = {name: Group.objects.get_or_create(name=name)[0] for name in ("ИС-21", "ИС-22")}
        teacher = User.objects.create_user("demo_teacher", password=PASSWORD, first_name="Дастан",
                                           last_name="Омурканов", role=User.Role.TEACHER)
        today = timezone.localdate()
        for i, (username, first, last, group) in enumerate(STUDENTS):
            user = User.objects.create_user(username, password=PASSWORD, first_name=first, last_name=last,
                                            role=User.Role.STUDENT, group=groups[group])
            count = 4 + i % 3
            tasks, positions = [], {}
            for j, (title, status) in enumerate(TASKS[i % 2:][:count]):
                pos = positions.get(status, 0)
                positions[status] = pos + 1
                title_labels = LABELS.get(title, [])
                tasks.append(Task.objects.create(owner=user, created_by=user, title=title, status=status, position=pos,
                                                 priority=PRIORITIES[(i + j) % len(PRIORITIES)],
                                                 estimate=(1, 2, 3, 5, None)[(i + j) % 5], labels=title_labels))
            day = today if today.weekday() != 6 else prev_study_day(today)
            for n in range(5 - i % 3):
                done, plans, blockers = DAILY_TEXTS[(n + i) % len(DAILY_TEXTS)]
                d = Daily.objects.create(author=user, date=day, done=done, plans=plans, blockers=blockers)
                d.tasks.set(tasks[n % len(tasks):n % len(tasks) + 1])
                day = prev_study_day(day)
        self._teacher_tasks(teacher, groups["ИС-21"], today)
        self.stdout.write(self.style.SUCCESS(f"Demo data created. Password for all users: {PASSWORD}"))

    def _teacher_tasks(self, teacher, group, today):
        students = list(User.objects.filter(group=group, role=User.Role.STUDENT).order_by("username"))
        for title, description, priority, estimate, offset, labels in TEACHER_TASKS:
            batch = uuid.uuid4()
            for s in students:
                last = Task.objects.filter(owner=s, status=Task.Status.TODO).count()
                Task.objects.create(owner=s, created_by=teacher, title=title, description=description,
                                    priority=priority, estimate=estimate, labels=labels, batch=batch,
                                    deadline=today + timedelta(days=offset), position=last)
        first, second = students[0], students[1]
        lab = Task.objects.get(owner=first, title=TEACHER_TASKS[0][0])
        lab.status, lab.position = Task.Status.REVIEW, 0
        lab.save()
        Comment.objects.create(task=lab, author=first, text="Готово, проверьте, пожалуйста.")
        profile = Task.objects.get(owner=second, title=TEACHER_TASKS[1][0])
        Comment.objects.create(task=profile, author=teacher, text="Не забудь про адаптив под телефон.")
