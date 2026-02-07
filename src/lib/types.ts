export type Profile = {
  id: string;
  email: string | null;
  role: "admin" | "parent";
  created_at: string;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  attachment_url?: string;
  attachment_type?: string;
};

export type PostRevision = {
  id: string;
  post_id: string;
  title_snapshot: string;
  content_snapshot: string;
  changed_by: string;
  created_at: string;
};

export type StudentFull = {
  student_id: string;
  student_name: string;
  english_first_name?: string;
  gender?: string;
  birth_date?: string;
  campus: string;
  status: string;

  parent_name?: string;
  parent_phone?: string;

  class_name?: string; // Academy Class (e.g. Kepler)
  grade?: string; // School Grade (e.g. 1st Grade)
  current_school?: string;
  english_history?: string;

  // Additional fields for Admin UI
  address?: string;
  address_detail?: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  bus?: string;
  departure_time?: string;
  dajim_enabled?: boolean;
  has_transport?: boolean;
  
  // Class Management
  main_class?: string;
  main_class_name?: string;
  program_classes?: {
    id: string;
    name: string;
    program_name?: string;
  }[];
};
