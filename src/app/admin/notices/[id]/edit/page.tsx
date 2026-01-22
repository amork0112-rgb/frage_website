//src/app/admin/notices/[id]/edit
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bell, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Editor from "@/components/Editor";

export default function AdminEditNoticePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campus, setCampus] = useState("All");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Schedule");
  const [richHtml, setRichHtml] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"admin" | "teacher" | "unknown">("unknown");
  const [promote, setPromote] = useState(false);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsFeatured, setNewsFeatured] = useState(false);
  const [newsPushEnabled, setNewsPushEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("id", Number(id))
        .single();
      const row: any = data || null;
      if (row) {
        setTitle(row.title || "");
        setCategory("Schedule");
        // Use content directly as HTML. If it was plain text, it will still render fine.
        setRichHtml(row.content || "");
        setImageUrl(row.image_url || "");
      }
      const auth = await supabase.auth.getUser();
      const appRole = (auth.data?.user?.app_metadata as any)?.role ?? null;
      setRole(appRole === "teacher" ? "teacher" : "admin");
    })();
  }, [id]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      alert("필수 항목을 입력해 주세요.");
      return;
    }
    setLoading(true);

    try {
      await supabase
        .from("posts")
        .update({
          title,
          content: richHtml, // Save HTML content
          category: "notice",
          image_url: imageUrl || null,
        })
        .eq("id", Number(id));

      if (promote) {
        const { data: existing } = await supabase
          .from("notice_promotions")
          .select("id")
          .eq("post_id", Number(id))
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
            .eq("post_id", Number(id));
        } else {
          await supabase
            .from("notice_promotions")
            .insert({
              post_id: Number(id),
              title: (newsTitle || title).trim(),
              pinned: newsFeatured,
              archived: false,
              push_enabled: newsPushEnabled,
            });
        }
      } else {
        await supabase.from("notice_promotions").delete().eq("post_id", Number(id));
      }

      alert("공지 수정이 저장되었습니다.");
      router.push("/admin/notices");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const canEdit = useMemo(() => true, []);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-6 h-6 text-frage-orange" />
        <h1 className="text-2xl font-black text-slate-900">공지 수정</h1>
      </div>

      

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">캠퍼스</label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              disabled={!canEdit}
            >
              <option value="All">전체</option>
              <option value="International">국제관</option>
              <option value="Andover">앤도버</option>
              <option value="Platz">플라츠</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              {["Schedule", "Academic"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => canEdit && setCategory(c)}
                  className={`py-2 rounded-lg font-bold text-sm border ${
                    category === c ? (c === "Schedule" ? "bg-orange-50 border-orange-200 text-frage-orange" : "bg-blue-50 border-blue-200 text-blue-600") : "bg-white border-slate-200 text-slate-600"
                  } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {c === "Schedule" ? "일정" : "학사"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm bg-white"
            placeholder="공지 제목"
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">대표 이미지 URL (선택)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 mb-4 text-sm bg-white"
            placeholder="https://..."
            disabled={!canEdit}
          />
          <label className="block text-sm font-bold text-slate-700 mb-2">내용</label>
          <Editor value={richHtml} onChange={setRichHtml} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/notices")}
            className="w-full bg-slate-100 text-slate-800 py-3 rounded-xl font-bold text-sm border border-slate-200"
          >
            목록으로
          </button>
          <button
            type="submit"
            disabled={loading || !canEdit}
            className="w-full bg-frage-navy text-white py-3 rounded-xl font-bold text-sm disabled:opacity-60"
          >
            {loading ? "저장 중..." : "수정 저장"}
          </button>
        </div>

        {canEdit && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className={`flex items-center gap-3 cursor-pointer ${role === "teacher" ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-slate-300 text-frage-orange focus:ring-frage-orange"
                checked={promote}
                onChange={(e) => role === "teacher" ? null : setPromote(e.target.checked)}
                disabled={role === "teacher"}
              />
              <span className="font-bold text-slate-700">프라게 소식으로 함께 게시</span>
            </label>
            {promote && (
              <div className="space-y-3">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-800 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div>
                    이 공지는 프라게 공식 소식 페이지와 홈페이지 소식 영역에도 함께 게시됩니다. (전체 학부모 대상)
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-bold text-slate-500 mb-2">소식 게시 옵션</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">소식 제목</label>
                      <input
                        type="text"
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        placeholder="(미입력 시 공지 제목 사용)"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-frage-orange focus:ring-frage-orange"
                        checked={newsFeatured}
                        onChange={(e) => setNewsFeatured(e.target.checked)}
                      />
                      <span className="text-sm font-bold text-slate-700">홈 상단 강조 소식으로 표시</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-slate-300 text-frage-orange focus:ring-frage-orange"
                          checked={newsPushEnabled}
                          onChange={(e) => setNewsPushEnabled(e.target.checked)}
                        />
                        <span className="text-sm font-bold text-slate-700">앱 푸시 발송 (기본 ON)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </main>
  );
}
