from datetime import time
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.common.scheduling import overlaps
from app.modules.sections.schemas import MeetingInput


@pytest.mark.parametrize(
    "start,end,day,expected",
    [
        (time(11), time(12), 0, True),
        (time(11, 30), time(13), 0, False),
        (time(10), time(11), 1, False),
        (time(9), time(12), 0, True),
    ],
)
def test_interval_overlap(start, end, day, expected):
    old = SimpleNamespace(meeting_day=0, start_time=time(10), end_time=time(11, 30))
    new = SimpleNamespace(meeting_day=day, start_time=start, end_time=end)
    assert overlaps(old, new) is expected


@pytest.mark.parametrize(
    "day,start,end",
    [
        (7, "10:00", "11:00"),
        (0, "11:00", "10:00"),
        (0, "10:00", "10:00"),
        (0, "10:00+05:00", "11:00+05:00"),
    ],
)
def test_invalid_meetings(day, start, end):
    with pytest.raises(ValidationError):
        MeetingInput(meeting_day=day, start_time=start, end_time=end)
