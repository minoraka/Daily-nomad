import pytest
from rest_framework.test import APIClient


@pytest.fixture
def group(db):
    from accounts.models import Group
    return Group.objects.create(name="ИС-21")


@pytest.fixture
def other_group(db):
    from accounts.models import Group
    return Group.objects.create(name="ИС-22")


def _make_user(username, first, last, role, group=None):
    from accounts.models import User
    return User.objects.create_user(username=username, password="Str0ng-pass!",
                                    first_name=first, last_name=last, role=role, group=group)


@pytest.fixture
def student(group):
    return _make_user("anya", "Аня", "Иванова", "student", group)


@pytest.fixture
def student2(group):
    return _make_user("petya", "Петя", "Сидоров", "student", group)


@pytest.fixture
def other_group_student(other_group):
    return _make_user("kolya", "Коля", "Петров", "student", other_group)


@pytest.fixture
def teacher(db):
    return _make_user("teacher", "Дастан", "Омурканов", "teacher")


@pytest.fixture
def teacher2(db):
    return _make_user("teacher2", "Айжан", "Сатыбалдиева", "teacher")


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def auth():
    def make(user):
        c = APIClient()
        c.force_authenticate(user)
        return c
    return make
