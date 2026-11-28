from board.models import Task


def mk(user, title, status="todo", position=0):
    return Task.objects.create(owner=user, created_by=user, title=title, status=status, position=position)


def test_student_creates_task_at_end_of_todo(auth, student):
    c = auth(student)
    a = c.post("/api/tasks/", {"title": "A"}).data
    b = c.post("/api/tasks/", {"title": "B", "description": "d"}).data
    assert (a["status"], a["position"]) == ("todo", 0)
    assert (b["status"], b["position"]) == ("todo", 1)
    assert b["owner"]["id"] == student.id and b["owner"]["initials"] == "ИА"


def test_create_ignores_client_owner_and_position(auth, student, student2):
    r = auth(student).post("/api/tasks/", {"title": "A", "owner": student2.id, "position": 50, "status": "done"})
    assert r.data["owner"]["id"] == student.id and r.data["position"] == 0 and r.data["status"] == "todo"


def test_teacher_cannot_create_task(auth, teacher):
    assert auth(teacher).post("/api/tasks/", {"title": "A"}).status_code == 403


def test_anonymous_cannot_list(api, db):
    assert api.get("/api/tasks/").status_code == 401


def test_cannot_edit_or_delete_foreign_task(auth, student, student2):
    t = mk(student2, "foreign")
    c = auth(student)
    assert c.patch(f"/api/tasks/{t.id}/", {"title": "x"}).status_code == 403
    assert c.delete(f"/api/tasks/{t.id}/").status_code == 403
    assert c.post(f"/api/tasks/{t.id}/move/", {"status": "done", "position": 0}).status_code == 403


def test_owner_can_edit_and_delete(auth, student):
    t = mk(student, "mine")
    c = auth(student)
    assert c.patch(f"/api/tasks/{t.id}/", {"title": "new"}).data["title"] == "new"
    assert c.delete(f"/api/tasks/{t.id}/").status_code == 204


def test_filter_by_group_and_owner(auth, student, student2, other_group_student, group):
    mk(student, "a"); mk(student2, "b"); mk(other_group_student, "c")
    c = auth(student)
    assert {t["title"] for t in c.get(f"/api/tasks/?group={group.id}").data} == {"a", "b"}
    assert [t["title"] for t in c.get(f"/api/tasks/?owner={student2.id}").data] == ["b"]


def test_move_reorders_within_column(auth, student):
    a, b, cc = mk(student, "a", position=0), mk(student, "b", position=1), mk(student, "c", position=2)
    r = auth(student).post(f"/api/tasks/{cc.id}/move/", {"status": "todo", "position": 0})
    assert r.status_code == 200
    order = list(Task.objects.filter(owner=student, status="todo").order_by("position").values_list("title", "position"))
    assert order == [("c", 0), ("a", 1), ("b", 2)]


def test_move_into_empty_column_and_clamps_position(auth, student):
    a, b, cc = mk(student, "a", position=0), mk(student, "b", position=1), mk(student, "c", position=2)
    r = auth(student).post(f"/api/tasks/{a.id}/move/", {"status": "done", "position": 99})
    assert (r.data["status"], r.data["position"]) == ("done", 0)
    order = list(Task.objects.filter(owner=student, status="todo").order_by("position").values_list("title", "position"))
    assert order == [("b", 0), ("c", 1)]


def test_move_rejects_bad_status(auth, student):
    a = mk(student, "a")
    assert auth(student).post(f"/api/tasks/{a.id}/move/", {"status": "nope", "position": 0}).status_code == 400


def test_move_does_not_touch_other_owners(auth, student, student2):
    a = mk(student, "a", position=0)
    x = mk(student2, "x", position=0)
    auth(student).post(f"/api/tasks/{a.id}/move/", {"status": "todo", "position": 5})
    x.refresh_from_db()
    assert x.position == 0


def test_patch_status_moves_to_end_of_target_and_renumbers_source(auth, student):
    a, b = mk(student, "a", position=0), mk(student, "b", position=1)
    mk(student, "d", status="done", position=0)
    r = auth(student).patch(f"/api/tasks/{a.id}/", {"status": "done"})
    assert (r.data["status"], r.data["position"]) == ("done", 1)
    b.refresh_from_db()
    assert b.position == 0


def test_delete_renumbers_column(auth, student):
    a, b = mk(student, "a", position=0), mk(student, "b", position=1)
    auth(student).delete(f"/api/tasks/{a.id}/")
    b.refresh_from_db()
    assert b.position == 0
