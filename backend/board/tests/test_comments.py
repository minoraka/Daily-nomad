from board.models import Comment
from board.tests.helpers import personal, teacher_task


def test_comment_permissions(auth, student, student2, teacher):
    own = personal(student)
    assert auth(student).post(f"/api/tasks/{own.id}/comments/", {"text": "hi"}).status_code == 201
    assert auth(student2).post(f"/api/tasks/{own.id}/comments/", {"text": "hi"}).status_code == 403
    assert auth(teacher).post(f"/api/tasks/{own.id}/comments/", {"text": "hi"}).status_code == 201
    tt = teacher_task(student, teacher)
    assert auth(student).post(f"/api/tasks/{tt.id}/comments/", {"text": "готово"}).status_code == 201
    assert auth(student2).post(f"/api/tasks/{tt.id}/comments/", {"text": "x"}).status_code == 403


def test_comments_listed_in_order_and_counted(auth, student, teacher):
    t = personal(student)
    auth(student).post(f"/api/tasks/{t.id}/comments/", {"text": "первый"})
    r = auth(teacher).post(f"/api/tasks/{t.id}/comments/", {"text": "  второй  "})
    assert r.data["text"] == "второй" and r.data["author"]["role"] == "teacher"
    listed = auth(student).get(f"/api/tasks/{t.id}/comments/").data
    assert [c["text"] for c in listed] == ["первый", "второй"]
    assert auth(student).get("/api/tasks/").data[0]["comments_count"] == 2
    assert auth(student).get(f"/api/tasks/{t.id}/").data["comments_count"] == 2


def test_blank_or_long_comment_400(auth, student):
    t = personal(student)
    c = auth(student)
    assert c.post(f"/api/tasks/{t.id}/comments/", {"text": "   "}).status_code == 400
    assert c.post(f"/api/tasks/{t.id}/comments/", {"text": "x" * 2001}).status_code == 400


def test_only_author_deletes_comment(auth, student, teacher):
    t = personal(student)
    cid = auth(teacher).post(f"/api/tasks/{t.id}/comments/", {"text": "x"}).data["id"]
    listed = auth(student).get(f"/api/tasks/{t.id}/comments/").data
    assert listed[0]["can_delete"] is False
    assert auth(student).delete(f"/api/comments/{cid}/").status_code == 403
    assert auth(teacher).get(f"/api/tasks/{t.id}/comments/").data[0]["can_delete"] is True
    assert auth(teacher).delete(f"/api/comments/{cid}/").status_code == 204
    assert Comment.objects.count() == 0


def test_anyone_logged_in_can_read_comments(auth, api, student, student2):
    t = personal(student)
    auth(student).post(f"/api/tasks/{t.id}/comments/", {"text": "x"})
    assert auth(student2).get(f"/api/tasks/{t.id}/comments/").status_code == 200
    assert api.get(f"/api/tasks/{t.id}/comments/").status_code == 401
