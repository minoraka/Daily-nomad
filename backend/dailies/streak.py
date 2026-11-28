"""Streak = consecutive study days (Mon–Sat) with a daily. Sunday neither counts nor breaks."""
from datetime import date, timedelta

from django.utils import timezone

SUNDAY = 6


def prev_study_day(d: date) -> date:
    d -= timedelta(days=1)
    return d - timedelta(days=1) if d.weekday() == SUNDAY else d


def compute_streak(dates: set[date], today: date) -> int:
    cur = today if today.weekday() != SUNDAY else prev_study_day(today)
    if cur == today and cur not in dates:
        cur = prev_study_day(cur)  # today's daily not written yet — streak is still alive
    n = 0
    while cur in dates:
        n += 1
        cur = prev_study_day(cur)
    return n


def week_strip(dates: set[date], today: date) -> list[dict]:
    monday = today - timedelta(days=today.weekday())
    days = [monday + timedelta(days=i) for i in range(6)]
    return [{"date": d.isoformat(), "has_daily": d in dates, "is_today": d == today} for d in days]


def streak_for(user) -> dict:
    today = timezone.localdate()
    dates = set(user.dailies.filter(date__gte=today - timedelta(days=400)).values_list("date", flat=True))
    return {"count": compute_streak(dates, today), "week": week_strip(dates, today)}
