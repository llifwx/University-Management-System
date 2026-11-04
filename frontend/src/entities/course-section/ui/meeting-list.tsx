import { WEEKDAYS, formatTime, toMinutes } from "@/shared/lib/time";

import type { Meeting } from "../model/types";

export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) return <span className="text-muted-foreground">No meetings scheduled</span>;
  const sorted = [...meetings].sort((a, b) => a.meeting_day - b.meeting_day || toMinutes(a.start_time) - toMinutes(b.start_time));
  return (
    <ul className="space-y-0.5">
      {sorted.map((meeting) => (
        <li key={meeting.id} className="tabular-nums">
          {WEEKDAYS[meeting.meeting_day]} {formatTime(meeting.start_time)}–{formatTime(meeting.end_time)}
        </li>
      ))}
    </ul>
  );
}
