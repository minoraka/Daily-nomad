import pytest

from board.tests.helpers import personal, teacher_task


@pytest.mark.parametrize("frm,to,code", [
    ("todo", "in_progress", 200), ("in_progress", "review", 200), ("review", "in_progress", 200),
    ("review", "done", 403), ("done", "review", 403), ("done", "done", 403),
])
def test_assignee_moves_teacher_task(auth, student, teacher, frm, to, code):
    t = teacher_task(student, teacher, status=frm)
    assert auth(student).post(f"/api/tasks/{t.id}/move/", {"status": to, "position": 0}).status_code == code


def test_student_cannot_patch_teacher_task_to_done(auth, student, teacher):
    t = teacher_task(student, teacher, status="review")
    assert auth(student).patch(f"/api/tasks/{t.id}/", {"status": "done"}).status_code == 403
    t.refresh_from_db()
    assert t.status == "review"


def test_student_can_patch_teacher_task_status_to_review(auth, student, teacher):
    t = teacher_task(student, teacher, status="in_progress")
    r = auth(student).patch(f"/api/tasks/{t.id}/", {"status": "review"})
    assert r.status_code == 200 and r.data["status"] == "review"


def test_student_cannot_edit_teacher_task_fields(auth, student, teacher):
    t = teacher_task(student, teacher)
    c = auth(student)
    assert c.patch(f"/api/tasks/{t.id}/", {"title": "мой"}).status_code == 403
    assert c.patch(f"/api/tasks/{t.id}/", {"status": "review", "title": "мой"}).status_code == 403
    assert c.delete(f"/api/tasks/{t.id}/").status_code == 403


def test_teacher_edits_moves_deletes_teacher_task(auth, student, teacher, teacher2):
    t = teacher_task(student, teacher, status="review")
    c = auth(teacher2)
    assert c.patch(f"/api/tasks/{t.id}/", {"title": "новое"}).status_code == 200
    assert c.post(f"/api/tasks/{t.id}/move/", {"status": "done", "position": 0}).status_code == 200
    assert c.delete(f"/api/tasks/{t.id}/").status_code == 204


def test_teacher_cannot_touch_personal_task(auth, student, teacher):
    t = personal(student)
    c = auth(teacher)
    assert c.patch(f"/api/tasks/{t.id}/", {"title": "x"}).status_code == 403
    assert c.post(f"/api/tasks/{t.id}/move/", {"status": "done", "position": 0}).status_code == 403
    assert c.delete(f"/api/tasks/{t.id}/").status_code == 403


def test_other_student_cannot_move_teacher_task(auth, student, student2, teacher):
    t = teacher_task(student, teacher)
    assert auth(student2).post(f"/api/tasks/{t.id}/move/", {"status": "in_progress", "position": 0}).status_code == 403


def test_student_moves_personal_task_to_done(auth, student):
    t = personal(student, status="review")
    assert auth(student).post(f"/api/tasks/{t.id}/move/", {"status": "done", "position": 0}).status_code == 200
