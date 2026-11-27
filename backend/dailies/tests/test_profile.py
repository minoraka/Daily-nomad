from datetime import UTC, date, datetime

import time_machine

from dailies.models import Daily


@time_machine.travel(datetime(2026, 11, 27, 6, 0, tzinfo=UTC), tick=False)
def test_me_includes_streak_for_student(auth, student):
    Daily.objects.create(author=student, date=date(2026, 11, 26), done="a")
    Daily.objects.create(author=student, date=date(2026, 11, 27), done="b")
    s = auth(student).get("/api/auth/me/").data["streak"]
    assert s["count"] == 2 and len(s["week"]) == 6


def test_teacher_streak_is_null(auth, teacher):
    assert auth(teacher).get("/api/auth/me/").data["streak"] is None


def test_user_profile_by_id(auth, teacher, student):
    r = auth(teacher).get(f"/api/users/{student.id}/")
    assert r.status_code == 200 and r.data["group"]["name"] == "ИС-21" and r.data["streak"]["count"] == 0
