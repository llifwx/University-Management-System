import { toMinutes } from "@/shared/lib/time";

export type TimetableEvent = {
  id: string;
  sectionId: number;
  day: number;
  start: string;
  end: string;
  code: string;
  title: string;
  section: string;
  instructor?: string;
};

export type PlacedEvent = { event: TimetableEvent; column: number; columns: number };

/**
 * Splits overlapping events into side-by-side columns so none hide each other. Events that only touch
 * share a column, matching the backend's rule that touching endpoints do not conflict.
 */
export function layoutDayEvents(events: TimetableEvent[]): PlacedEvent[] {
  const sorted = [...events].sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end));
  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    for (const item of cluster) item.columns = columnEnds.length;
    placed.push(...cluster);
    cluster = [];
    columnEnds = [];
  };

  for (const event of sorted) {
    const start = toMinutes(event.start);
    const end = toMinutes(event.end);
    if (start >= clusterEnd) closeCluster();
    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = end;
    cluster.push({ event, column, columns: 1 });
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end);
  }
  closeCluster();
  return placed;
}

/** Visible hours: a normal working day, stretched to include anything outside it. */
export function visibleHours(events: TimetableEvent[]): { first: number; last: number } {
  const starts = events.map((e) => toMinutes(e.start) / 60);
  const ends = events.map((e) => toMinutes(e.end) / 60);
  return { first: Math.floor(Math.min(8, ...starts)), last: Math.ceil(Math.max(18, ...ends)) };
}
