from datetime import UTC, date, datetime

import pytest
import time_machine

from board.models import Task


def test_create_with_new_fields(auth, student):
    r = auth(student).post("/api/tasks/", {"title": "A", "priority": "high", "estimate": 3,
                                           "deadline": "2026-12-05", "labels": ["Frontend"]}, format="json")
    assert r.status_code == 201, r.data
    assert r.data["key"] == f"SB-{r.data['id']}"
    assert (r.data["priority"], r.data["estimate"], r.data["deadline"], r.data["labels"]) == \
        ("high", 3, "2026-12-05", ["Frontend"])
    assert r.data["from_teacher"] is False
    assert r.data["created_by"]["id"] == student.id and r.data["created_by"]["role"] == "student"
    assert r.data["comments_count"] == 0


def test_defaults(auth, student):
    r = auth(student).post("/api/tasks/", {"title": "A"}, format="json")
    assert (r.data["priority"], r.data["estimate"], r.data["deadline"], r.data["labels"]) == ("medium", None, None, [])
    assert r.data["is_overdue"] is False


@pytest.mark.parametrize("est", [4, 0, 13])
def test_estimate_must_be_fibonacci(auth, student, est):
    assert auth(student).post("/api/tasks/", {"title": "A", "estimate": est}, format="json").status_code == 400


def test_labels_normalized_and_validated(auth, student):
    c = auth(student)
    r = c.post("/api/tasks/", {"title": "A", "labels": ["  ", "Frontend", "frontend", " API "]}, format="json")
    assert r.data["labels"] == ["Frontend", "API"]
    assert c.post("/api/tasks/", {"title": "A", "labels": ["x" * 25]}, format="json").status_code == 400
    assert c.post("/api/tasks/", {"title": "A", "labels": list("abcdef")}, format="json").status_code == 400
    assert c.post("/api/tasks/", {"title": "A", "labels": "Frontend"}, format="json").status_code == 400


def test_is_overdue_uses_bishkek_date(auth, student):
    Task.objects.create(owner=student, created_by=student, title="late", deadline=date(2026, 11, 27))
    Task.objects.create(owner=student, created_by=student, title="closed", deadline=date(2026, 11, 1), status="done")
    c = auth(student)
    with time_machine.travel(datetime(2026, 11, 27, 6, 0, tzinfo=UTC), tick=False):
        data = {t["title"]: t["is_overdue"] for t in c.get("/api/tasks/").data}
        assert data == {"late": False, "closed": False}
    with time_machine.travel(datetime(2026, 11, 27, 20, 30, tzinfo=UTC), tick=False):
        data = {t["title"]: t["is_overdue"] for t in c.get("/api/tasks/").data}
        assert data == {"late": True, "closed": False}


def test_review_status_move(auth, student):
    t = Task.objects.create(owner=student, created_by=student, title="a")
    r = auth(student).post(f"/api/tasks/{t.id}/move/", {"status": "review", "position": 0})
    assert r.status_code == 200 and r.data["status"] == "review"
