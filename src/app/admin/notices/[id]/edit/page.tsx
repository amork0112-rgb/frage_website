"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bell, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Eye, FilePlus2, Table, Info, ExternalLink, CheckCircle2 } from "lucide-react";
import { notices } from "@/data/notices";

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
  const [isStatic, setIsStatic] = useState(false);
  const [promotion, setPromotion] = useState<{ newsPostId?: number } | null>(null);
  const [role, setRole] = useState<"admin" | "teacher" | "unknown">("unknown");

  useEffect(() => {
    const raw = localStorage.getItem("frage_notices");
    const dyn = raw ? JSON.parse(raw) : [];
    const foundDyn = Array.isArray(dyn) ? dyn.find((d: any) => d.id === id) : null;
    if (foundDyn) {
      setCampus(foundDyn.campus || "All");
      setTitle(foundDyn.title || "");
      setCategory(foundDyn.category || "Schedule");
      const html = foundDyn.richHtml || "";
      setRichHtml(html);
      if (editorRef.current) editorRef.current.innerHTML = html;
      setImages(foundDyn.images || []);
      setFiles(foundDyn.files || []);
      setIsStatic(false);
      try {
        const mapRaw = localStorage.getItem("frage_notice_promotions");
        const map = mapRaw ? JSON.parse(mapRaw) : {};
        if (map[id]) setPromotion(map[id]);
      } catch {}
      return;
    }
    const foundStatic = notices.find(n => n.id === id);
    if (foundStatic) {
      setCampus(foundStatic.campus || "All");
      setTitle(foundStatic.title || "");
      setCategory(foundStatic.category || "Schedule");
      const html = (foundStatic.content || []).map(p => `<p>${p}</p>`).join("");
      setRichHtml(html);
      if (editorRef.current) editorRef.current.innerHTML = html;
      setImages([]);
      setFiles([]);
      setIsStatic(true);
    }
    try {
      const r = String(localStorage.getItem("admin_role") || "").trim();
      setRole(r === "teacher" ? "teacher" : "admin");
    } catch {
      setRole("admin");
    }
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
    if (isStatic) {
      alert("샘플 공지는 코드 데이터로 관리되어 직접 저장할 수 없습니다.\n새 공지 작성 페이지에서 등록해 주세요.");
      return;
    }
    if (!validate()) {
      alert("필수 항목을 입력해 주세요.");
      return;
    }
    setLoading(true);
    const contentHtml = editorRef.current?.innerHTML || "";
    const summary = plainText(contentHtml).slice(0, 140);
    const key = "frage_notices";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = (Array.isArray(existing) ? existing : []).map((it: any) =>
      it.id === id
        ? {
            ...it,
            title,
            category,
            campus,
            richHtml: contentHtml,
            summary,
            images,
            files,
          }
        : it
    );
    localStorage.setItem(key, JSON.stringify(updated));
    setTimeout(() => {
      alert("공지 수정이 저장되었습니다.");
      router.push("/admin/notices");
    }, 500);
  };

  const canEdit = useMemo(() => !isStatic, [isStatic]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-6 h-6 text-frage-orange" />
        <h1 className="text-2xl font-black text-slate-900">공지 수정</h1>
      </div>

      {promotion && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-700">프라게 소식으로 게시됨</p>
            <p className="text-xs text-slate-500 mt-1">이 공지는 프라게 소식으로도 게시되었습니다. 소식 내용을 수정하려면 소식 관리 페이지에서 수정하세요.</p>
          </div>
          {promotion.newsPostId ? (
            <a
              href={`/admin/${promotion.newsPostId}/edit`}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-frage-orange text-white hover:bg-frage-gold transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              소식으로 이동
            </a>
          ) : (
            <a
              href="/admin"
              className="px-3 py-2 rounded-lg text-xs font-bold bg-frage-orange text-white hover:bg-frage-gold transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              소식으로 이동
            </a>
          )}
        </div>
      )}

      {isStatic && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-400 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-700">샘플 공지(코드 데이터)는 직접 저장할 수 없습니다</p>
            <p className="text-xs text-slate-500 mt-1">새 공지 작성 페이지에서 동일 내용으로 등록해 주세요.</p>
          </div>
        </div>
      )}

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
                  <span className="text-sm font-medium text-slate-700">{f.name}</span>
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-frage-blue">열기</a>
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
      </form>
    </main>
  );
}
