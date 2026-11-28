import pytest


def test_register_student_returns_tokens(api, group):
    r = api.post("/api/auth/register/", {"username": "anya2", "password": "Str0ng-pass!",
        "first_name": "Аня", "last_name": "Иванова", "role": "student", "group": group.id})
    assert r.status_code == 201, r.data
    assert {"access", "refresh"} <= r.data.keys()
    assert r.data["user"]["group"]["id"] == group.id


def test_register_teacher_without_group(api, db):
    r = api.post("/api/auth/register/", {"username": "t2", "password": "Str0ng-pass!",
        "first_name": "A", "last_name": "B", "role": "teacher"})
    assert r.status_code == 201, r.data
    assert r.data["user"]["group"] is None


@pytest.mark.parametrize("role,with_group", [("student", False), ("teacher", True)])
def test_register_role_group_validation(api, group, role, with_group):
    data = {"username": "x", "password": "Str0ng-pass!", "first_name": "A", "last_name": "B", "role": role}
    if with_group:
        data["group"] = group.id
    assert api.post("/api/auth/register/", data).status_code == 400


def test_login_returns_tokens(api, student):
    r = api.post("/api/auth/token/", {"username": "anya", "password": "Str0ng-pass!"})
    assert r.status_code == 200 and "access" in r.data


def test_me_requires_auth(api, db):
    assert api.get("/api/auth/me/").status_code == 401


def test_me_returns_initials(auth, student):
    r = auth(student).get("/api/auth/me/")
    assert r.data["initials"] == "ИА"
    assert r.data["role"] == "student"


def test_groups_list_is_public(api, group):
    r = api.get("/api/groups/")
    assert r.status_code == 200 and r.data[0]["name"] == "ИС-21"


def test_group_students_lists_only_students(auth, group, student, teacher):
    ids = [u["id"] for u in auth(teacher).get(f"/api/groups/{group.id}/students/").data]
    assert ids == [student.id]


def test_weak_password_error_on_password_field(api, group):
    r = api.post("/api/auth/register/", {"username": "z", "password": "123",
        "first_name": "A", "last_name": "B", "role": "student", "group": group.id})
    assert r.status_code == 400 and "password" in r.data
