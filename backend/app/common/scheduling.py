def overlaps(first, second) -> bool:
    return (
        first.meeting_day == second.meeting_day
        and first.start_time < second.end_time
        and second.start_time < first.end_time
    )
