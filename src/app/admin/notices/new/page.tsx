"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Eye,
  FilePlus2,
  Table,
  Info,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminNewNoticePage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);

  const [campus, setCampus] = useState("All");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Schedule");
  const [richHtml, setRichHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [role, setRole] = useState<"admin" | "teacher">("admin");

  const [promote, setPromote] = useState(false);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsFeatured, setNewsFeatured] = useState(false);

  /* ---------------- auth role ---------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const appRole = (data?.user?.app_metadata as any)?.role;
      if (appRole === "teacher") setRole("teacher");
    })();
  }, []);

  /* ---------------- editor utils ---------------- */
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    setRichHtml(editorRef.current?.innerHTML || "");
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && selectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(selectionRef.current);
    }
  };

  const insertImageAtCaret = (url: string, alt = "") => {
    restoreSelection();
    const html = `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;" />`;
    document.execCommand("insertHTML", false, html);
    setRichHtml(editorRef.current?.innerHTML || "");
  };

  const insertTable = () => {
    const html = `
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <th style="border:1px solid #ddd;padding:8px;">Header</th>
          <th style="border:1px solid #ddd;padding:8px;">Header</th>
        </tr>
        <tr>
          <td style="border:1px solid #ddd;padding:8px;">Cell</td>
          <td style="border:1px solid #ddd;padding:8px;">Cell</td>
        </tr>
      </table>`;
    document.execCommand("insertHTML", false, html);
    setRichHtml(editorRef.current?.innerHTML || "");
  };

  const plainText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const validate = () => {
    if (!title.trim()) return false;
    if (!campus) return false;
    if (!category) return false;
    if (!plainText(editorRef.current?.innerHTML || "").trim()) return false;
    return true;
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
      const contentHtml = editorRef.current?.innerHTML || "";
      const contentText = plainText(contentHtml);

      /* ✅ 공지 저장 */
      const { error } = await supabase
        .from("posts")
        .insert({
          title,
          content: contentText,
          category: "notice",
          published: true,
          is_pinned: false,
          image_url: null,
        });

      if (error) {
        console.error("NOTICE INSERT ERROR:", error);
        alert("공지 저장 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      /* ✅ 소식 동시 게시 */
      if (promote) {
        const { error: newsError } = await supabase
          .from("posts")
          .insert({
            title: (newsTitle || title).trim(),
            content: contentText,
            category: "news",
            published: true,
            is_pinned: newsFeatured,
          });

        if (newsError) {
          console.error("NEWS INSERT ERROR:", newsError);
        }
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
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" onClick={() => exec("bold")}><Bold /></button>
            <button type="button" onClick={() => exec("italic")}><Italic /></button>
            <button type="button" onClick={() => exec("underline")}><Underline /></button>
            <button type="button" onClick={() => exec("justifyLeft")}><AlignLeft /></button>
            <button type="button" onClick={() => exec("justifyCenter")}><AlignCenter /></button>
            <button type="button" onClick={() => exec("justifyRight")}><AlignRight /></button>
            <button type="button" onClick={() => exec("insertUnorderedList")}><List /></button>
            <button type="button" onClick={insertTable}><Table /></button>
            <button type="button" onClick={() => setPreviewOpen(!previewOpen)}><Eye /></button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            onInput={() => {
              setRichHtml(editorRef.current?.innerHTML || "");
              saveSelection();
            }}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onFocus={saveSelection}
            className="min-h-[180px] border rounded-xl p-4"
          />

          {previewOpen && (
            <div className="mt-3 border rounded-xl p-4 bg-slate-50"
              dangerouslySetInnerHTML={{ __html: richHtml }} />
          )}
        </div>

        {/* image insert */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-xl border border-dashed p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">이미지 삽입</span>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer">
                <FilePlus2 className="w-4 h-4" />
                선택
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const filesArr = Array.from(e.target.files || []);
                    filesArr.forEach((f) => {
                      const url = URL.createObjectURL(f);
                      insertImageAtCaret(url, f.name);
                    });
                  }}
                />
              </label>
            </div>
            <div className="text-xs text-slate-500">선택한 이미지는 커서 위치에 바로 삽입됩니다.</div>
          </div>
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
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
