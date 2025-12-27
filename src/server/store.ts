export type Scores = { Reading: number; Listening: number; Speaking: number; Writing: number };
export type VideoScores = { fluency: number; volume: number; speed: number; pronunciation: number; performance: number };
export type ReportItem = {
  studentId: string;
  month: string;
  className: string;
  gender: "M" | "F";
  scores: Scores;
  comments: Record<keyof Scores, string>;
  videoScores: VideoScores;
  overall: string;
  status?: "미작성" | "작성중" | "저장완료" | "발송요청" | "발송완료";
  updatedAt: string;
};

export const teacherReportsStore: Map<string, ReportItem> = new Map();

export type PublishedReportSummary = {
  id: string;
  title: string;
  date: string;
  month: string;
  status: "Ready" | "Viewed";
};

export const publishedReportsStore: Map<string, PublishedReportSummary[]> = new Map();

export type PushNotice = {
  id: string;
  studentId: string;
  message: string;
  createdAt: string;
};

export const pushStore: Map<string, PushNotice[]> = new Map();
