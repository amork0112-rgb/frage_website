import { NextResponse } from "next/server";

type Status = "재원" | "휴원" | "퇴원";

type Student = {
  id: string;
  name: string;
  englishName: string;
  birthDate: string;
  phone: string;
  className: string;
  campus: string;
  status: Status;
};

type AlertItem = {
  id: string;
  name: string;
  campus: string;
  className: string;
  status: Status;
  signals: { type: "video_miss" | "portal_low" | "report_unread"; value: string }[];
  level: "주의" | "경고" | "위험";
  firstDetectedAt: string;
};

function computeLevel(count: number): "주의" | "경고" | "위험" | null {
  if (count <= 0) return null;
  if (count === 1) return "주의";
  if (count === 2) return "경고";
  return "위험";
}

export async function GET() {
  const students: Student[] = [
    { id: "s1", name: "김민서", englishName: "Minseo Kim", birthDate: "2015-03-15", phone: "010-1234-5678", className: "A1b", campus: "Andover", status: "재원" },
    { id: "s2", name: "박수영", englishName: "Suyeong Park", birthDate: "2014-08-21", phone: "010-9876-5432", className: "Kepler A", campus: "Andover", status: "재원" },
    { id: "s3", name: "이서준", englishName: "Seojun Lee", birthDate: "2013-11-02", phone: "010-2222-3333", className: "Kepler B", campus: "Atheneum", status: "휴원" },
    { id: "s4", name: "김하린", englishName: "Harin Kim", birthDate: "2015-06-30", phone: "010-4444-5555", className: "A1b", campus: "International", status: "재원" },
    { id: "s5", name: "최지우", englishName: "Jiwu Choi", birthDate: "2014-01-09", phone: "010-6666-7777", className: "Kepler A", campus: "Andover", status: "재원" },
  ];

  const videoHistory: Record<string, ("submitted" | "missed")[]> = {
    s1: ["missed", "submitted", "missed", "submitted"],
    s2: ["submitted", "submitted", "submitted", "submitted"],
    s3: ["missed", "missed", "submitted", "missed"],
    s4: ["submitted", "missed", "missed", "submitted"],
    s5: ["missed", "submitted", "submitted", "missed"],
  };

  const portalStats: Record<
    string,
    { lastLoginAt: string | null; last14Count: number; prev30Avg: number; joinedAt: string }
  > = {
    s1: { lastLoginAt: new Date(Date.now() - 16 * 86400000).toISOString(), last14Count: 0, prev30Avg: 10, joinedAt: new Date(Date.now() - 60 * 86400000).toISOString() },
    s2: { lastLoginAt: new Date(Date.now() - 3 * 86400000).toISOString(), last14Count: 4, prev30Avg: 5, joinedAt: new Date(Date.now() - 200 * 86400000).toISOString() },
    s3: { lastLoginAt: null, last14Count: 0, prev30Avg: 0, joinedAt: new Date(Date.now() - 100 * 86400000).toISOString() },
    s4: { lastLoginAt: new Date(Date.now() - 20 * 86400000).toISOString(), last14Count: 0, prev30Avg: 8, joinedAt: new Date(Date.now() - 40 * 86400000).toISOString() },
    s5: { lastLoginAt: new Date(Date.now() - 18 * 86400000).toISOString(), last14Count: 0, prev30Avg: 6, joinedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  };

  const reportStats: Record<string, { publishedAt: string; notified: boolean; readAt: string | null }> = {
    s1: { publishedAt: new Date(Date.now() - 9 * 86400000).toISOString(), notified: true, readAt: null },
    s2: { publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(), notified: true, readAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    s3: { publishedAt: new Date(Date.now() - 20 * 86400000).toISOString(), notified: true, readAt: null },
    s4: { publishedAt: new Date(Date.now() - 10 * 86400000).toISOString(), notified: true, readAt: null },
    s5: { publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(), notified: true, readAt: null },
  };

  const items: AlertItem[] = students
    .filter(s => s.status === "재원")
    .map(s => {
      const signals: AlertItem["signals"] = [];
      const vh = videoHistory[s.id] || [];
      const missed = vh.filter(v => v === "missed").length;
      if (missed >= 2) {
        signals.push({ type: "video_miss", value: `미제출 ${missed}회/최근4회` });
      }
      const ps = portalStats[s.id];
      const daysSinceLast = ps?.lastLoginAt ? Math.floor((Date.now() - new Date(ps.lastLoginAt).getTime()) / 86400000) : 999;
      const joinedDays = Math.floor((Date.now() - new Date(ps.joinedAt).getTime()) / 86400000);
      const portalDrop = daysSinceLast >= 14 && ps.last14Count === 0 && ps.prev30Avg >= 3 && joinedDays > 7;
      if (portalDrop) {
        signals.push({ type: "portal_low", value: `미접속 ${daysSinceLast}일` });
      }
      const rs = reportStats[s.id];
      const reportDays = rs?.publishedAt ? Math.floor((Date.now() - new Date(rs.publishedAt).getTime()) / 86400000) : 0;
      const unread = rs?.notified && reportDays >= 7 && !rs.readAt;
      if (unread) {
        signals.push({ type: "report_unread", value: "리포트 미열람" });
      }
      const level = computeLevel(signals.length);
      const firstDetectedAt = new Date().toISOString().split("T")[0];
      return level
        ? {
            id: s.id,
            name: s.name,
            campus: s.campus,
            className: s.className,
            status: s.status,
            signals,
            level,
            firstDetectedAt,
          }
        : null;
    })
    .filter(Boolean) as AlertItem[];

  const filtered = items.filter(it => it.level !== "주의");
  return NextResponse.json({ items: filtered });
}
