export type CalendarEvent = {
  id: string;
  campus: "international" | "atheneum";
  title: string;
  start: string;
  end?: string;
  description?: string;
  category:
    | "event"
    | "birthday"
    | "contest"
    | "academic"
    | "holiday"
    | "vacation"
    | "assessment";
};
