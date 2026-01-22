//app/admin/notices/new
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Editor from "@/components/Editor";

export default function AdminNewNoticePage() {
  const router = useRouter();

  const [campus, setCampus] = useState("All");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Schedule");
  const [richHtml, setRichHtml] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [role, setRole] = useState<"admin" | "teacher">("admin");

  const [promote, setPromote] = useState(false);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsFeatured, setNewsFeatured] = useState(false);
  const [newsPushEnabled, setNewsPushEnabled] = useState(true);

  /* ---------------- auth role ---------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const appRole = (data?.user?.app_metadata as any)?.role;
      if (appRole === "teacher") setRole("teacher");
    })();
  }, []);

  const plainText = (html: string) => {
    if (typeof window === "undefined") return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const validate = () => {
    if (!title.trim()) return false;
    if (!campus) return false;
    if (!category) return false;
    if (!plainText(richHtml).trim()) return false;
    return true;
  };

  /* ---------------- upload ---------------- */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `notices/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("notice-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("notice-images")
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
    } catch (error) {
      console.error(error);
      alert("이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- submit ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      alert("필수 항목을 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const contentText = plainText(richHtml);

      const { data: inserted, error } = await supabase
        .from("posts")
        .insert({
          title,
          content: richHtml, 
          category: "notice",
          published: true,
          is_pinned: false,
          image_url: imageUrl || null,
          scope: role === "admin" ? "global" : "class", // Explicitly set scope
        })
        .select()
        .single();
      if (error || !inserted) {
        console.error("NOTICE INSERT ERROR:", error);
        alert("공지 저장 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (promote) {
        const postId = Number(inserted.id);
        const { data: existing } = await supabase
          .from("notice_promotions")
          .select("id")
          .eq("post_id", postId)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("notice_promotions")
            .update({
              title: (newsTitle || title).trim(),
              pinned: newsFeatured,
              push_enabled: newsPushEnabled,
              archived: false,
            })
            .eq("post_id", postId);
        } else {
          await supabase
            .from("notice_promotions")
            .insert({
              post_id: postId,
              title: (newsTitle || title).trim(),
              pinned: newsFeatured,
              archived: false,
              push_enabled: newsPushEnabled,
            });
        }
      } else {
        const postId = Number(inserted.id);
        await supabase.from("notice_promotions").delete().eq("post_id", postId);
      }

      alert("공지 등록이 완료되었습니다.");
      router.push("/admin/notices");

    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);
      alert("예기치 못한 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-6 h-6 text-frage-orange" />
        <h1 className="text-2xl font-black">새 공지 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-6">
        {/* campus & category */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">캠퍼스</label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="All">전체</option>
              <option value="International">국제관</option>
              <option value="Andover">앤도버</option>
              <option value="Platz">플라츠</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCategory("Schedule")}
                className={`py-2 rounded-lg font-bold border ${category === "Schedule" ? "bg-orange-50 border-orange-200 text-frage-orange" : ""}`}>
                일정
              </button>
              <button type="button" onClick={() => setCategory("Academic")}
                className={`py-2 rounded-lg font-bold border ${category === "Academic" ? "bg-blue-50 border-blue-200 text-blue-600" : ""}`}>
                학사
              </button>
            </div>
          </div>
        </div>

        {/* title */}
        <div>
          <label className="block text-sm font-bold mb-2">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-4 py-3"
            placeholder="공지 제목"
          />
        </div>

        {/* editor */}
        <div>
          <label className="block text-sm font-bold mb-2">대표 이미지</label>
          <div className="mb-4">
            <label htmlFor="file-upload" className={`inline-block px-4 py-2 bg-slate-200 rounded-lg cursor-pointer text-sm font-bold hover:bg-slate-300 transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
              {uploading ? "업로드 중..." : "이미지 선택"}
            </label>
            <input 
              id="file-upload"
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
            {imageUrl && (
              <div className="mt-3 relative w-full max-w-sm">
                <img 
                  src={imageUrl} 
                  alt="Representative" 
                  className="w-full rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                  title="이미지 삭제"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <Editor value={richHtml} onChange={setRichHtml} />
        </div>

        {/* submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-frage-navy text-white py-3 rounded-xl font-bold"
        >
          {loading ? "등록 중..." : "공지 등록"}
        </button>

        {/* promote */}
        <div className="pt-4 border-t space-y-3">
          <label className={`flex items-center gap-3 ${role === "teacher" ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={promote}
              onChange={(e) => role === "teacher" ? null : setPromote(e.target.checked)}
              disabled={role === "teacher"}
            />
            <span className="font-bold">프라게 소식으로 함께 게시</span>
          </label>

          {promote && (
            <div className="bg-orange-50 border rounded-xl p-3 text-sm">
              <Info className="inline w-4 h-4 mr-1" />
              홈페이지 소식에도 함께 게시됩니다.
              <input
                className="mt-2 w-full border rounded px-3 py-2"
                placeholder="소식 제목 (선택)"
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={newsFeatured}
                  onChange={(e) => setNewsFeatured(e.target.checked)}
                />
                홈 상단 강조
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={newsPushEnabled}
                  onChange={(e) => setNewsPushEnabled(e.target.checked)}
                />
                앱 푸시 발송
              </label>
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
