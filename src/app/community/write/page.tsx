"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function WritePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Notice",
    content: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/portal");
      return;
    }

    const { error } = await supabase.from("posts").insert({
      title: formData.title,
      category: formData.category,
      content: formData.content,
      author_id: user.id
    });

    if (error) {
      alert("글 작성에 실패했습니다: " + error.message);
      setLoading(false);
    } else {
      router.push("/community");
      router.refresh();
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-10 px-6">
      <h1 className="text-2xl font-bold text-frage-navy mb-6">글쓰기</h1>
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
            placeholder="제목을 입력하세요"
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
            placeholder="내용을 입력하세요"
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
            disabled={loading}
            className="rounded-lg bg-frage-primary px-4 py-2 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-50"
          >
            {loading ? "저장 중..." : "작성 완료"}
          </button>
        </div>
      </form>
    </div>
  );
}
