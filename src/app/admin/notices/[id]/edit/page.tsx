"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bell, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Eye, FilePlus2, Table, Info, ExternalLink, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminEditNoticePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const editorRef = useRef<HTMLDivElement>(null);
  const [campus, setCampus] = useState("All");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Schedule");
  const [richHtml, setRichHtml] = useState("");
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [files, setFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promotion, setPromotion] = useState<{ newsPostId?: number; featured?: boolean; pushEnabled?: boolean } | null>(null);
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
        const html = (String(row.content || "") || "").split(/\n+/).map((p: string) => `<p>${p}</p>`).join("");
        setRichHtml(html);
        if (editorRef.current) editorRef.current.innerHTML = html;
        setImages([]);
        setFiles([]);
      }
      const auth = await supabase.auth.getUser();
      const appRole = (auth.data?.user?.app_metadata as any)?.role ?? null;
      setRole(appRole === "teacher" ? "teacher" : "admin");
    })();
  }, [id]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    setRichHtml(editorRef.current?.innerHTML || "");
  };

  const insertTable = () => {
    const html = `<table style="width:100%;border-collapse:collapse;"><tr><th style="border:1px solid #ddd;padding:8px;">Header</th><th style="border:1px solid #ddd;padding:8px;">Header</th></tr><tr><td style="border:1px solid #ddd;padding:8px;">Cell</td><td style="border:1px solid #ddd;padding:8px;">Cell</td></tr></table>`;
    document.execCommand("insertHTML", false, html);
    setRichHtml(editorRef.current?.innerHTML || "");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesArr = Array.from(e.target.files || []);
    const next = filesArr.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...next]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesArr = Array.from(e.target.files || []);
    const next = filesArr.map(f => ({ name: f.name, url: URL.createObjectURL(f), type: f.type }));
    setFiles(prev => [...prev, ...next]);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const filesArr = Array.from(e.dataTransfer.files || []);
    const imagesOnly = filesArr.filter(f => f.type.startsWith("image/"));
    const next = imagesOnly.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...next]);
  };

  const handleAttachDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const filesArr = Array.from(e.dataTransfer.files || []);
    const next = filesArr.map(f => ({ name: f.name, url: URL.createObjectURL(f), type: f.type }));
    setFiles(prev => [...prev, ...next]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const plainText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const validate = () => {
    const content = editorRef.current?.innerHTML || "";
    if (!title.trim()) return false;
    if (!campus) return false;
    if (!category) return false;
    if (!plainText(content).trim()) return false;
    return true;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      alert("필수 항목을 입력해 주세요.");
      return;
    }
    setLoading(true);
    const contentHtml = editorRef.current?.innerHTML || "";
    const summary = plainText(contentHtml).slice(0, 140);
    const updateSupabase = async () => {
      try {
        await supabase
          .from("posts")
          .update({
            title,
            content: plainText(contentHtml),
            category: "notice",
          })
          .eq("id", Number(id));
      } catch {}
    };
    updateSupabase();

    const doPromote = async () => {
      if (!promote) return;
      const insert = {
        title: (newsTitle || title).trim(),
        content: plainText(contentHtml),
        category: "news",
        published: true,
        is_pinned: newsFeatured,
        image_url: null as any,
      };
      await supabase.from("posts").insert(insert);
    };
    
    doPromote();

    setTimeout(() => {
      alert("공지 수정이 저장되었습니다.");
      router.push("/admin/notices");
    }, 500);
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

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => canEdit && exec("bold")} className="px-3 py-2 rounded-lg border text-sm"><Bold className="w-4 h-4" /></button>
            <button type="button" onClick={() => canEdit && exec("italic")} className="px-3 py-2 rounded-lg border text-sm"><Italic className="w-4 h-4" /></button>
            <button type="button" onClick={() => canEdit && exec("underline")} className="px-3 py-2 rounded-lg border text-sm"><Underline className="w-4 h-4" /></button>
            <button type="button" onClick={() => canEdit && exec("justifyLeft")} className="px-3 py-2 rounded-lg border text-sm"><AlignLeft className="w-4 h-4" /></button>
            <button type="button" onClick={() => canEdit && exec("justifyCenter")} className="px-3 py-2 rounded-lg border text-sm"><AlignCenter className="w-4 h-4" /></button>
            <button type="button" onClick={() => canEdit && exec("justifyRight")} className="px-3 py-2 rounded-lg border text-sm"><AlignRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => canEdit && exec("insertUnorderedList")} className="px-3 py-2 rounded-lg border text-sm"><List className="w-4 h-4" /></button>
            <button type="button" onClick={() => canEdit && insertTable()} className="px-3 py-2 rounded-lg border text-sm"><Table className="w-4 h-4" /></button>
            <select onChange={(e) => canEdit && exec("fontSize", e.target.value)} className="px-2 py-2 rounded-lg border text-sm">
              <option value="3">크기</option>
              <option value="2">작게</option>
              <option value="3">보통</option>
              <option value="4">크게</option>
              <option value="5">아주 크게</option>
            </select>
            <input type="color" onChange={(e) => canEdit && exec("foreColor", e.target.value)} className="w-10 h-10 rounded border" />
            <button type="button" onClick={() => setPreviewOpen(!previewOpen)} className="px-3 py-2 rounded-lg border text-sm"><Eye className="w-4 h-4" /></button>
          </div>
          <div
            ref={editorRef}
            contentEditable={canEdit}
            onInput={() => setRichHtml(editorRef.current?.innerHTML || "")}
            className={`min-h-[180px] border border-slate-200 rounded-xl p-4 bg-white text-sm leading-relaxed ${!canEdit ? "opacity-50" : ""}`}
          />
          {previewOpen && (
            <div className="mt-3 border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div dangerouslySetInnerHTML={{ __html: richHtml }} />
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={canEdit ? handleImageDrop : undefined}
            className={`rounded-xl border border-dashed border-slate-300 p-4 ${!canEdit ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-700">이미지 업로드</span>
              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${!canEdit ? "pointer-events-none" : ""}`}>
                <FilePlus2 className="w-4 h-4" />
                선택
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} disabled={!canEdit} />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={`${img.name}-${i}`} className="aspect-square rounded-lg overflow-hidden border">
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={canEdit ? handleAttachDrop : undefined}
            className={`rounded-xl border border-dashed border-slate-300 p-4 ${!canEdit ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-700">파일 첨부</span>
              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${!canEdit ? "pointer-events-none" : ""}`}>
                <FilePlus2 className="w-4 h-4" />
                선택
                <input type="file" multiple className="hidden" onChange={handleFileSelect} disabled={!canEdit} />
              </label>
            </div>
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm font-medium text-slate-700 truncate flex-1 mr-2">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-frage-blue hover:underline">열기</a>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
