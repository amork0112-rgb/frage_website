"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

import { CalendarEvent } from "@/types/calendar";

type Props = {
  events: CalendarEvent[];
  editable: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: string) => void;
};

export default function FrageCalendar({
  events,
  editable,
  onEventClick,
  onDateClick,
}: Props) {
  return (
    <FullCalendar
      plugins={[
        dayGridPlugin,
        timeGridPlugin,
        listPlugin,
        interactionPlugin,
      ]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,listMonth",
      }}
      height="auto"
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: CATEGORY_COLOR[e.category],
        borderColor: CATEGORY_COLOR[e.category],
        extendedProps: e,
      }))}
      editable={editable}
      selectable={editable}
      eventClick={(info) => {
        if (onEventClick) {
          onEventClick(info.event.extendedProps as CalendarEvent);
        }
      }}
      dateClick={(info) => {
        if (editable && onDateClick) {
          onDateClick(info.dateStr);
        }
      }}
    />
  );
}
