from datetime import UTC, datetime, timedelta

import time_machine

from board.models import Task
from dailies.models import Daily

NOON = datetime(2026, 11, 27, 6, 0, tzinfo=UTC)  # 12:00 in Bishkek


@time_machine.travel(NOON, tick=False)
def test_create_daily_today(auth, student):
    r = auth(student).post("/api/dailies/", {"done": "сделала логин", "plans": "JWT"})
    assert r.status_code == 201, r.data
    assert r.data["date"] == "2026-11-27" and r.data["can_edit"] is True
    assert r.data["author"]["id"] == student.id


@time_machine.travel(NOON, tick=False)
def test_done_is_required(auth, student):
    assert auth(student).post("/api/dailies/", {"plans": "x"}).status_code == 400


@time_machine.travel(NOON, tick=False)
def test_second_daily_same_day_rejected(auth, student):
    c = auth(student)
    c.post("/api/dailies/", {"done": "a"})
    assert c.post("/api/dailies/", {"done": "b"}).status_code == 400


def test_teacher_cannot_create_daily(auth, teacher):
    assert auth(teacher).post("/api/dailies/", {"done": "a"}).status_code == 403


@time_machine.travel(NOON, tick=False)
def test_daily_links_own_tasks(auth, student):
    t = Task.objects.create(owner=student, title="JWT")
    r = auth(student).post("/api/dailies/", {"done": "a", "task_ids": [t.id]}, format="json")
    assert r.status_code == 201
    assert r.data["tasks"] == [{"id": t.id, "title": "JWT", "status": "todo"}]


@time_machine.travel(NOON, tick=False)
def test_daily_rejects_foreign_task(auth, student, student2):
    t = Task.objects.create(owner=student2, title="чужая")
    r = auth(student).post("/api/dailies/", {"done": "a", "task_ids": [t.id]}, format="json")
    assert r.status_code == 400


def test_cannot_edit_yesterdays_daily(auth, student):
    c = auth(student)
    with time_machine.travel(NOON, tick=False):
        d = c.post("/api/dailies/", {"done": "a"}).data
    with time_machine.travel(NOON + timedelta(days=1), tick=False):
        assert c.get(f"/api/dailies/{d['id']}/").data["can_edit"] is False
        assert c.patch(f"/api/dailies/{d['id']}/", {"done": "b"}).status_code == 403
        assert c.delete(f"/api/dailies/{d['id']}/").status_code == 403


@time_machine.travel(NOON, tick=False)
def test_cannot_edit_foreign_daily(auth, student, student2):
    d = auth(student2).post("/api/dailies/", {"done": "a"}).data
    c = auth(student)
    assert c.patch(f"/api/dailies/{d['id']}/", {"done": "b"}).status_code == 403
    assert c.get(f"/api/dailies/{d['id']}/").data["can_edit"] is False


@time_machine.travel(NOON, tick=False)
def test_owner_edits_today(auth, student):
    c = auth(student)
    d = c.post("/api/dailies/", {"done": "a"}).data
    assert c.patch(f"/api/dailies/{d['id']}/", {"done": "b"}).data["done"] == "b"


def test_daily_date_uses_bishkek_midnight(auth, student):
    with time_machine.travel(datetime(2026, 11, 27, 20, 30, tzinfo=UTC), tick=False):
        assert auth(student).post("/api/dailies/", {"done": "x"}).data["date"] == "2026-11-28"


def test_feed_filtered_by_group_and_paginated(auth, student, other_group_student, group):
    from datetime import date
    for i in range(25):
        Daily.objects.create(author=student, date=date(2026, 10, 1) + timedelta(days=i), done=str(i))
    Daily.objects.create(author=other_group_student, date=date(2026, 10, 1), done="other")
    r = auth(student).get(f"/api/dailies/?group={group.id}")
    assert r.data["count"] == 25 and len(r.data["results"]) == 20
    assert r.data["results"][0]["done"] == "24"  # newest first


@time_machine.travel(NOON, tick=False)
def test_today_endpoint_404_then_200(auth, student):
    c = auth(student)
    assert c.get("/api/dailies/today/").status_code == 404
    c.post("/api/dailies/", {"done": "a"})
    assert c.get("/api/dailies/today/").data["done"] == "a"
