import { CalendarEvent } from "@/types/calendar";

export async function fetchCalendarEvents(
  campus: "international" | "atheneum"
): Promise<CalendarEvent[]> {
  const res = await fetch(`/api/calendar?campus=${campus}`);
  return res.json();
}
