from board.models import Task


def teacher_task(owner, teacher, status="todo", position=0, title="ДЗ"):
    return Task.objects.create(owner=owner, created_by=teacher, title=title, status=status, position=position)


def personal(owner, status="todo", position=0, title="своя"):
    return Task.objects.create(owner=owner, created_by=owner, title=title, status=status, position=position)
