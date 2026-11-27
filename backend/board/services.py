from django.db import transaction

from .models import Task


def _renumber(tasks):
    for i, t in enumerate(tasks):
        if t.position != i:
            t.position = i
            t.save(update_fields=["position", "updated_at"])


def move_task(task: Task, status: str, position: int) -> Task:
    """Move a task to `status` at index `position` among its owner's tasks in that column."""
    with transaction.atomic():
        siblings = Task.objects.select_for_update().filter(owner_id=task.owner_id)
        old_status = task.status
        target = [t for t in siblings.filter(status=status).order_by("position", "id") if t.id != task.id]
        index = min(max(position, 0), len(target))
        task.status = status
        task.save(update_fields=["status", "updated_at"])
        target.insert(index, task)
        task.position = -1  # force save inside _renumber
        _renumber(target)
        if old_status != status:
            _renumber(list(siblings.filter(status=old_status).order_by("position", "id")))
    return task
