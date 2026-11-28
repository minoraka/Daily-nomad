"""Who may do what with a task. Mirrored in frontend/src/board/policy.ts — keep both in sync."""
from .models import Task

TEACHER = "teacher"


def is_teacher_task(task: Task) -> bool:
    return task.created_by.role == TEACHER


def can_edit_fields(user, task: Task) -> bool:
    if is_teacher_task(task):
        return user.role == TEACHER
    return user.id == task.owner_id


def can_move(user, task: Task, to_status: str) -> bool:
    if not is_teacher_task(task):
        return user.id == task.owner_id
    if user.role == TEACHER:
        return True
    # The assignee works up to "review"; only a teacher accepts (done) or reopens a done task.
    return user.id == task.owner_id and task.status != Task.Status.DONE and to_status != Task.Status.DONE


def can_delete(user, task: Task) -> bool:
    return can_edit_fields(user, task)


def can_comment(user, task: Task) -> bool:
    return user.id == task.owner_id or user.role == TEACHER
