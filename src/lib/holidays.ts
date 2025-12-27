export type HolidayEvent = {
  title: string;
  start: string;
  end: string;
  type: "공휴일";
  exposeToParent: boolean;
  description?: string;
};

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const nextMonday = (d: Date) => {
  const n = new Date(d);
  const day = n.getDay();
  const add = day === 6 ? 2 : day === 0 ? 1 : 0;
  n.setDate(n.getDate() + add);
  return n;
};

const format = (d: Date) => d.toISOString().split("T")[0];

const fixedSolar = (year: number) => {
  const base = [
    { title: "신정", date: new Date(year, 0, 1) },
    { title: "삼일절", date: new Date(year, 2, 1) },
    { title: "어린이날", date: new Date(year, 4, 5) },
    { title: "현충일", date: new Date(year, 5, 6) },
    { title: "광복절", date: new Date(year, 7, 15) },
    { title: "개천절", date: new Date(year, 9, 3) },
    { title: "한글날", date: new Date(year, 9, 9) },
    { title: "성탄절", date: new Date(year, 11, 25) }
  ];
  const events: HolidayEvent[] = base.map(b => ({
    title: b.title,
    start: format(b.date),
    end: format(b.date),
    type: "공휴일",
    exposeToParent: true
  }));
  base.forEach(b => {
    if (isWeekend(b.date)) {
      const sub = nextMonday(b.date);
      events.push({
        title: `${b.title} 대체휴일`,
        start: format(sub),
        end: format(sub),
        type: "공휴일",
        exposeToParent: true
      });
    }
  });
  return events;
};

const lunarMap: Record<number, { seollal: [string, string, string]; chuseok: [string, string, string]; buddha: string; buddhaObserved?: string }> = {
  2025: {
    seollal: ["2025-01-28", "2025-01-29", "2025-01-30"],
    chuseok: ["2025-10-05", "2025-10-06", "2025-10-07"],
    buddha: "2025-05-05"
  },
  2026: {
    seollal: ["2026-02-16", "2026-02-17", "2026-02-18"],
    chuseok: ["2026-09-24", "2026-09-25", "2026-09-26"],
    buddha: "2026-05-24",
    buddhaObserved: "2026-05-25"
  },
  2027: {
    seollal: ["2027-02-06", "2027-02-07", "2027-02-08"],
    chuseok: ["2027-09-14", "2027-09-15", "2027-09-16"],
    buddha: "2027-05-13"
  }
};

export function getKoreanHolidays(year: number): HolidayEvent[] {
  const events: HolidayEvent[] = [];
  const solar = fixedSolar(year);
  events.push(...solar);
  const lunar = lunarMap[year];
  if (lunar) {
    lunar.seollal.forEach((d, i) => {
      events.push({
        title: i === 1 ? "설날" : "설날 연휴",
        start: d,
        end: d,
        type: "공휴일",
        exposeToParent: true
      });
    });
    lunar.chuseok.forEach((d, i) => {
      events.push({
        title: i === 1 ? "추석" : "추석 연휴",
        start: d,
        end: d,
        type: "공휴일",
        exposeToParent: true
      });
    });
    events.push({
      title: "석가탄신일",
      start: lunar.buddha,
      end: lunar.buddha,
      type: "공휴일",
      exposeToParent: true
    });
    if (lunar.buddhaObserved) {
      events.push({
        title: "석가탄신일 대체휴일",
        start: lunar.buddhaObserved,
        end: lunar.buddhaObserved,
        type: "공휴일",
        exposeToParent: true
      });
    } else {
      const bd = new Date(lunar.buddha);
      if (isWeekend(bd)) {
        const sub = nextMonday(bd);
        events.push({
          title: "석가탄신일 대체휴일",
          start: format(sub),
          end: format(sub),
          type: "공휴일",
          exposeToParent: true
        });
      }
    }
  }
  return events;
}

