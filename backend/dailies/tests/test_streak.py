from datetime import date, timedelta

from dailies.streak import compute_streak, week_strip

FRI = date(2026, 11, 27)
D = lambda n: timedelta(days=n)  # noqa: E731


def test_streak_counts_consecutive_including_today():
    assert compute_streak({FRI, FRI - D(1), FRI - D(2)}, FRI) == 3


def test_streak_kept_when_today_missing():
    assert compute_streak({FRI - D(1), FRI - D(2)}, FRI) == 2


def test_streak_broken_by_missed_study_day():
    assert compute_streak({FRI, FRI - D(2)}, FRI) == 1


def test_streak_zero_when_yesterday_missing_too():
    assert compute_streak({FRI - D(2)}, FRI) == 0


def test_sunday_skipped():
    assert compute_streak({date(2026, 11, 21), date(2026, 11, 23)}, date(2026, 11, 23)) == 2


def test_on_sunday_counts_from_saturday():
    assert compute_streak({date(2026, 11, 28)}, date(2026, 11, 29)) == 1


def test_sunday_daily_not_counted():
    assert compute_streak({date(2026, 11, 29)}, date(2026, 11, 30)) == 0


def test_week_strip_mon_to_sat():
    w = week_strip({FRI}, FRI)
    assert len(w) == 6 and w[0]["date"] == "2026-11-23" and w[-1]["date"] == "2026-11-28"
    assert w[4] == {"date": "2026-11-27", "has_daily": True, "is_today": True}
    assert w[0]["has_daily"] is False


def test_week_strip_on_sunday_shows_ending_week():
    w = week_strip(set(), date(2026, 11, 29))
    assert w[0]["date"] == "2026-11-23" and not any(x["is_today"] for x in w)
