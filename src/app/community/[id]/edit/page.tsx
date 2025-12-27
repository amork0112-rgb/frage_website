"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    content: ""
  });

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert("게시글을 불러올 수 없습니다.");
        router.push("/community");
        return;
      }

      setPost(data);
      setFormData({
        title: data.title,
        category: data.category,
        content: data.content
      });
      setLoading(false);
    };

    fetchPost();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Save revision
    const { error: revisionError } = await supabase.from("post_revisions").insert({
      post_id: post.id,
      title_snapshot: post.title,
      content_snapshot: post.content,
      changed_by: user.id
    });

    if (revisionError) {
      console.error("Failed to save revision:", revisionError);
      // We continue even if revision fails? Maybe warn user.
    }

    // 2. Update post
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        title: formData.title,
        category: formData.category,
        content: formData.content,
        updated_at: new Date().toISOString()
      })
      .eq("id", post.id);

    if (updateError) {
      alert("수정에 실패했습니다: " + updateError.message);
      setSaving(false);
    } else {
      router.push(`/community/${post.id}`);
      router.refresh();
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl py-10 px-6">
      <h1 className="text-2xl font-bold text-frage-navy mb-6">게시글 수정</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            카테고리
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-frage-primary focus:outline-none focus:ring-1 focus:ring-frage-primary"
          >
            <option value="Notice">Notice</option>
            <option value="Event">Event</option>
            <option value="Academic">Academic</option>
            <option value="General">General</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            제목
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-frage-primary focus:outline-none focus:ring-1 focus:ring-frage-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            내용
          </label>
          <textarea
            required
            rows={10}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full rounded-md border border-slate-300 p-2 text-slate-900 focus:border-frage-primary focus:outline-none focus:ring-1 focus:ring-frage-primary"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-frage-primary px-4 py-2 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "수정 완료"}
          </button>
        </div>
      </form>
    </div>
  );
}
