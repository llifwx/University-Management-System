import { WEEKDAYS, formatTime, toMinutes } from "@/shared/lib/time";

import type { Meeting } from "../model/types";

export function MeetingList({ meetings, roomCodeById }: { meetings: Meeting[]; roomCodeById?: Map<number, string> }) {
  if (meetings.length === 0) return <span className="text-muted-foreground">No meetings scheduled</span>;
  const sorted = [...meetings].sort((a, b) => a.meeting_day - b.meeting_day || toMinutes(a.start_time) - toMinutes(b.start_time));
  return (
    <ul className="space-y-0.5">
      {sorted.map((meeting) => (
        <li key={meeting.id} className="tabular-nums">
          {WEEKDAYS[meeting.meeting_day]} {formatTime(meeting.start_time)}–{formatTime(meeting.end_time)}
          {meeting.room_id !== null && <span className="text-muted-foreground"> · {roomCodeById?.get(meeting.room_id) ?? `Room ${meeting.room_id}`}</span>}
        </li>
      ))}
    </ul>
  );
}
