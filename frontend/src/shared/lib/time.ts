/** Backend times are campus-local, offset-free "HH:MM[:SS]" strings: never route them through Date. */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** "10:30:00" -> "10:30", which is also the value format of <input type="time">. */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** JS Date#getDay (Sunday=0) -> backend meeting_day (Monday=0). */
export function toMeetingDay(date: Date): number {
  return (date.getDay() + 6) % 7;
}
