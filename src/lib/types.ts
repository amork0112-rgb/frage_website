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
};

export type PostRevision = {
  id: string;
  post_id: string;
  title_snapshot: string;
  content_snapshot: string;
  changed_by: string;
  created_at: string;
};
