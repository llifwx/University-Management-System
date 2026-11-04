"use client";

import { CalendarX } from "lucide-react";
import { useState } from "react";

import { WEEKDAYS, formatTime, toMeetingDay, toMinutes } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/states";

import { TimetableEvent, layoutDayEvents, visibleHours } from "../lib/layout";

const HOUR_HEIGHT = 56;

const describe = (e: TimetableEvent) => `${e.code} ${e.title}, section ${e.section}, ${WEEKDAYS[e.day]} ${formatTime(e.start)} to ${formatTime(e.end)}`;

function WeekGrid({ events, onSelect }: { events: TimetableEvent[]; onSelect: (event: TimetableEvent) => void }) {
  const { first, last } = visibleHours(events);
  const hours = Array.from({ length: last - first }, (_, index) => first + index);
  const height = hours.length * HOUR_HEIGHT;
  return (
    <div data-testid="week-grid" className="bg-card hidden overflow-hidden rounded-xl border shadow-sm lg:block">
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
        <div />
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-muted-foreground border-l px-2 py-2 text-center text-xs font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]" style={{ height }}>
        <div className="relative">
          {hours.map((hour, index) => (
            <span key={hour} className="text-muted-foreground absolute right-2 text-xs tabular-nums" style={{ top: index * HOUR_HEIGHT + 2 }}>
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        {WEEKDAYS.map((day, dayIndex) => (
          <div key={day} className="relative border-l" data-day={day}>
            {hours.map((hour, index) => (
              <div key={hour} className="border-border/60 absolute inset-x-0 border-t first:border-t-0" style={{ top: index * HOUR_HEIGHT }} />
            ))}
            {layoutDayEvents(events.filter((event) => event.day === dayIndex)).map(({ event, column, columns }) => {
              const top = ((toMinutes(event.start) - first * 60) / 60) * HOUR_HEIGHT;
              const blockHeight = ((toMinutes(event.end) - toMinutes(event.start)) / 60) * HOUR_HEIGHT;
              return (
                <button
                  key={event.id}
                  type="button"
                  aria-label={describe(event)}
                  title={describe(event)}
                  onClick={() => onSelect(event)}
                  className="bg-accent text-accent-foreground border-primary hover:bg-accent/70 focus-visible:ring-ring absolute overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-left text-xs focus-visible:ring-2 focus-visible:outline-none"
                  style={{ top, height: blockHeight - 2, left: `calc(${(column / columns) * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }}
                >
                  <span className="block truncate font-semibold">{event.code}</span>
                  <span className="block truncate tabular-nums">
                    {formatTime(event.start)}–{formatTime(event.end)}
                  </span>
                  {blockHeight > 60 && <span className="block truncate opacity-80">{event.title}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({ events, onSelect }: { events: TimetableEvent[]; onSelect: (event: TimetableEvent) => void }) {
  const [day, setDay] = useState(() => toMeetingDay(new Date()));
  const dayEvents = events.filter((event) => event.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  return (
    <div data-testid="day-view" className="space-y-3 lg:hidden">
      <div role="group" aria-label="Choose a day" className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((name, index) => (
          <Button
            key={name}
            size="sm"
            variant={index === day ? "default" : "outline"}
            aria-pressed={index === day}
            aria-label={name}
            className="h-11 px-0"
            onClick={() => setDay(index)}
          >
            {name.slice(0, 3)}
          </Button>
        ))}
      </div>
      {dayEvents.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">No classes on {WEEKDAYS[day]}.</p>
      ) : (
        <ul className="space-y-2">
          {dayEvents.map((event) => (
            <li key={event.id}>
              <button type="button" onClick={() => onSelect(event)} className="bg-card border-primary w-full rounded-lg border border-l-2 p-3 text-left shadow-sm">
                <span className="block text-sm font-semibold tabular-nums">
                  {formatTime(event.start)}–{formatTime(event.end)}
                </span>
                <span className="block text-sm">
                  {event.code} · {event.title}
                </span>
                <span className="text-muted-foreground block text-xs">
                  Section {event.section}
                  {event.instructor && ` · ${event.instructor}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WeeklyTimetable({ events, emptyMessage = "No classes scheduled for this semester." }: { events: TimetableEvent[]; emptyMessage?: string }) {
  const [selected, setSelected] = useState<TimetableEvent | null>(null);
  if (events.length === 0) return <EmptyState icon={CalendarX} title="Nothing on the timetable" description={emptyMessage} />;
  return (
    <>
      <WeekGrid events={events} onSelect={setSelected} />
      <DayView events={events} onSelect={setSelected} />
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.code} · {selected.title}
                </DialogTitle>
                <DialogDescription>Section {selected.section}</DialogDescription>
              </DialogHeader>
              <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm")}>
                <dt className="text-muted-foreground">When</dt>
                <dd className="tabular-nums">
                  {WEEKDAYS[selected.day]} {formatTime(selected.start)}–{formatTime(selected.end)}
                </dd>
                {selected.instructor && (
                  <>
                    <dt className="text-muted-foreground">Instructor</dt>
                    <dd>{selected.instructor}</dd>
                  </>
                )}
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
