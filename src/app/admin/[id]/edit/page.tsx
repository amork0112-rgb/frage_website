"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("news");
  const [published, setPublished] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedOrder, setPinnedOrder] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPost() {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("글을 불러올 수 없습니다.");
        setLoading(false);
        return;
      }

      setTitle(data.title);
      setContent(data.content);
      setCategory(data.category);
      setPublished(data.published);
      setIsPinned(data.is_pinned ?? false);
      setPinnedOrder(typeof data.pinned_order === "number" ? data.pinned_order : '');
      setImageUrl(data.image_url ?? "");

      setLoading(false);
    }

    loadPost();
  }, [id]);

  async function handleUpdate() {
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("posts")
      .update({
        title,
        content,
        category,
        published,
        is_pinned: isPinned,
        pinned_order: isPinned && pinnedOrder !== '' ? Number(pinnedOrder) : null,
        image_url: imageUrl,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/admin");
  }

  async function handleDelete() {
    const ok = confirm("정말 이 글을 삭제하시겠습니까?");
    if (!ok) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/admin");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-bold">불러오는 중...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pt-16">
       <header className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Link href="/admin" className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
               <ArrowLeft className="w-5 h-5" />
             </Link>
             <h1 className="text-xl font-bold text-slate-900">글 수정</h1>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">고정 순서</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={pinnedOrder}
                    onChange={(e) => setPinnedOrder(e.target.value ? Number(e.target.value) : '')}
                    disabled={!isPinned}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    placeholder="예: 1"
                  />
                </div>
            </div>

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded">{error}</p>}

            <div className="pt-6 flex gap-3">
                <button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="flex-grow bg-frage-navy text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-frage-blue transition-colors disabled:opacity-50"
                >
                    {saving ? "저장 중..." : "수정 저장"}
                </button>

                <button
                    onClick={handleDelete}
                    className="px-6 py-4 border-2 border-red-100 text-red-500 rounded-xl font-bold text-lg hover:bg-red-50 transition-colors"
                >
                    삭제
                </button>
            </div>
        </div>
      </main>
    </div>
  );
}
