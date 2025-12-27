export type NoticeCategory = 'Schedule' | 'Event' | 'Academic' | 'General';
export type CampusType = 'All' | 'International' | 'Andover' | 'Platz' | 'Atheneum';

export interface Notice {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: NoticeCategory;
  campus: CampusType; // Added campus field
  summary: string;
  content: string[]; // Paragraphs
  isPinned?: boolean;
  pinnedOrder?: number;
  isArchived?: boolean;
  viewCount: number;
  isRead: boolean; // Mock for current user
  reactions: {
    check: number; // 확인했어요
    heart: number; // 좋아요
    smile: number; // 감사합니다
  };
}

export const notices: Notice[] = [];
