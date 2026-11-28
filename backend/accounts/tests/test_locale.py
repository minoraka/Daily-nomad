import pytest
from django.core.management import call_command

from accounts.models import User


@pytest.mark.parametrize("lang,needle", [("ru", "Обязательное поле"), ("en", "This field is required"),
                                         ("ky", "Бул талаа керектүү")])
def test_register_errors_follow_accept_language(api, db, lang, needle):
    r = api.post("/api/auth/register/", {}, HTTP_ACCEPT_LANGUAGE=lang)
    assert needle in str(r.data["username"][0])


@pytest.mark.parametrize("lang,needle", [("ru", "Неверный логин"), ("ky", "Логин же сырсөз"),
                                         ("en", "No active account")])
def test_login_error_translated(api, db, lang, needle):
    r = api.post("/api/auth/token/", {"username": "nobody", "password": "x"}, HTTP_ACCEPT_LANGUAGE=lang)
    assert needle in str(r.data["detail"])


def test_custom_message_in_kyrgyz(api, db):
    r = api.post("/api/auth/register/", {"username": "u", "password": "Str0ng-pass!", "first_name": "a",
                                         "last_name": "b", "role": "student"}, HTTP_ACCEPT_LANGUAGE="ky")
    assert "агымды" in str(r.data["group"][0])


def test_seed_demo_idempotent(db):
    call_command("seed_demo")
    n = User.objects.count()
    call_command("seed_demo")
    assert n == User.objects.count() == 7
