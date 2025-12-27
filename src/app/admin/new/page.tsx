"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminNewPostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("news");
  const [published, setPublished] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("posts").insert({
      title,
      content,
      category,
      published,
      is_pinned: isPinned,
      image_url: imageUrl,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pt-16">
       <header className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Link href="/admin" className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
               <ArrowLeft className="w-5 h-5" />
             </Link>
             <h1 className="text-xl font-bold text-slate-900">새 글 작성</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-frage-blue"
                placeholder="제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">카테고리</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-frage-blue bg-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="news">Frage News (소식)</option>
                <option value="notice">Notice (공지)</option>
                <option value="event">Event (행사)</option>
                <option value="academic">Academic (학업)</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">내용</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-4 py-3 h-64 focus:outline-none focus:ring-2 focus:ring-frage-blue resize-none"
                placeholder="내용을 입력하세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

             {/* Image URL */}
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">대표 이미지 URL (선택)</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-frage-blue"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            {/* Options */}
            <div className="flex items-center gap-8 pt-4 border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 text-frage-blue focus:ring-frage-blue"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    />
                    <span className="font-bold text-slate-700">바로 공개</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 text-red-500 focus:ring-red-500"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    />
                    <span className="font-bold text-slate-700">상단 고정 (메인 노출)</span>
                </label>
            </div>

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded">{error}</p>}

            <div className="pt-6">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-frage-navy text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-frage-blue transition-colors disabled:opacity-50"
                >
                    {loading ? "저장 중..." : "글 저장하기"}
                </button>
            </div>
        </div>
      </main>
    </div>
  );
}