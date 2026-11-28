from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Group, User
from board.models import Task
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


class Command(BaseCommand):
    help = "Create demo groups, users, tasks and dailies (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        if User.objects.filter(username="demo_teacher").exists():
            self.stdout.write("Demo data already exists — skipping.")
            return
        groups = {name: Group.objects.get_or_create(name=name)[0] for name in ("ИС-21", "ИС-22")}
        User.objects.create_user("demo_teacher", password=PASSWORD, first_name="Дастан",
                                 last_name="Омурканов", role=User.Role.TEACHER)
        today = timezone.localdate()
        for i, (username, first, last, group) in enumerate(STUDENTS):
            user = User.objects.create_user(username, password=PASSWORD, first_name=first, last_name=last,
                                            role=User.Role.STUDENT, group=groups[group])
            count = 4 + i % 3
            tasks, positions = [], {}
            for title, status in TASKS[i % 2:][:count]:
                pos = positions.get(status, 0)
                positions[status] = pos + 1
                tasks.append(Task.objects.create(owner=user, created_by=user, title=title, status=status, position=pos))
            day = today if today.weekday() != 6 else prev_study_day(today)
            for n in range(5 - i % 3):
                done, plans, blockers = DAILY_TEXTS[(n + i) % len(DAILY_TEXTS)]
                d = Daily.objects.create(author=user, date=day, done=done, plans=plans, blockers=blockers)
                d.tasks.set(tasks[n % len(tasks):n % len(tasks) + 1])
                day = prev_study_day(day)
        self.stdout.write(self.style.SUCCESS(f"Demo data created. Password for all users: {PASSWORD}"))
