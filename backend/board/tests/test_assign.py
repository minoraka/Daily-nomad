from accounts.models import Group
from board.models import Task
from board.tests.helpers import personal


def test_assign_to_students(auth, teacher, student, student2):
    r = auth(teacher).post("/api/tasks/assign/", {"title": "ДЗ 1", "assignees": [student.id, student2.id],
                                                  "deadline": "2026-12-01", "priority": "high"}, format="json")
    assert r.status_code == 201, r.data
    assert len(r.data) == 2
    assert {t["owner"]["id"] for t in r.data} == {student.id, student2.id}
    assert all(t["from_teacher"] and t["status"] == "todo" and t["priority"] == "high" for t in r.data)
    assert Task.objects.filter(title="ДЗ 1").values("batch").distinct().count() == 1
    assert Task.objects.filter(title="ДЗ 1").first().batch is not None


def test_assign_to_group(auth, teacher, group, student, student2, other_group_student):
    r = auth(teacher).post("/api/tasks/assign/", {"title": "Лаба", "group": group.id}, format="json")
    assert r.status_code == 201
    assert {t["owner"]["id"] for t in r.data} == {student.id, student2.id}


def test_assign_appends_to_end_of_todo(auth, teacher, student):
    personal(student, position=0)
    r = auth(teacher).post("/api/tasks/assign/", {"title": "x", "assignees": [student.id]}, format="json")
    assert r.data[0]["position"] == 1


def test_assign_to_empty_group_400(auth, teacher, db):
    empty = Group.objects.create(name="Пустой")
    r = auth(teacher).post("/api/tasks/assign/", {"title": "x", "group": empty.id}, format="json")
    assert r.status_code == 400 and Task.objects.count() == 0


def test_assign_requires_exactly_one_target(auth, teacher, group, student):
    c = auth(teacher)
    assert c.post("/api/tasks/assign/", {"title": "x"}, format="json").status_code == 400
    assert c.post("/api/tasks/assign/", {"title": "x", "group": group.id, "assignees": [student.id]},
                  format="json").status_code == 400
    assert c.post("/api/tasks/assign/", {"title": "x", "assignees": []}, format="json").status_code == 400


def test_assign_rejects_teacher_or_missing_ids(auth, teacher, teacher2):
    c = auth(teacher)
    assert c.post("/api/tasks/assign/", {"title": "x", "assignees": [teacher2.id]}, format="json").status_code == 400
    assert c.post("/api/tasks/assign/", {"title": "x", "assignees": [999]}, format="json").status_code == 400
    assert c.post("/api/tasks/assign/", {"title": "x", "group": 999}, format="json").status_code == 400


def test_assign_validates_fields(auth, teacher, student):
    r = auth(teacher).post("/api/tasks/assign/", {"title": "x", "assignees": [student.id], "estimate": 4},
                           format="json")
    assert r.status_code == 400


def test_student_cannot_assign(auth, student, group):
    assert auth(student).post("/api/tasks/assign/", {"title": "x", "group": group.id},
                              format="json").status_code == 403


def test_teacher_cannot_create_personal_task(auth, teacher):
    assert auth(teacher).post("/api/tasks/", {"title": "A"}).status_code == 403
