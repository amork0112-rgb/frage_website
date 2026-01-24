"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import "react-quill/dist/quill.snow.css";
import { supabase } from "@/lib/supabase";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false }) as any;

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  // ✅ 진짜 Quill editor 인스턴스
  const editorRef = useRef<any>(null);
  const [editorReady, setEditorReady] = useState(false);

  /* ---------------- 이미지 업로드 ---------------- */
  const uploadImageToSupabase = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop();
    const fileName = `editor/${Date.now()}_${Math.random()}.${ext}`;

    const { error } = await supabase.storage
      .from("notice-images")
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from("notice-images")
      .getPublicUrl(fileName);

    if (!data?.publicUrl) throw new Error("publicUrl not generated");

    return data.publicUrl;
  }, []);

  /* ---------------- 이미지 버튼 ---------------- */
  const imageHandler = useCallback(() => {
    if (!editorRef.current) {
      console.error("❌ editor not ready");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const url = await uploadImageToSupabase(file);
        const editor = editorRef.current;

        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();

        editor.insertEmbed(index, "image", url);
        editor.setSelection(index + 1);

        onChange(editor.root.innerHTML);
      } catch (e: any) {
        console.error(e);
        alert(e.message);
      }
    };
  }, [uploadImageToSupabase, onChange]);

  /* ---------------- Paste ---------------- */
  useEffect(() => {
    if (!editorReady || !editorRef.current) return;

    const editor = editorRef.current;

    const handlePaste = async (e: any) => {
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      const file = clipboardData?.files?.[0];
      
      if (file?.type.startsWith("image/")) {
        e.preventDefault();
        try {
            const url = await uploadImageToSupabase(file);
            const range = editor.getSelection();
            const index = range ? range.index : editor.getLength();
            editor.insertEmbed(index, "image", url);
            editor.setSelection(index + 1);
            onChange(editor.root.innerHTML);
        } catch (e: any) {
            console.error("Paste failed", e);
            alert("이미지 붙여넣기 실패: " + e.message);
        }
      }
    };

    editor.root.addEventListener("paste", handlePaste);
    return () => editor.root.removeEventListener("paste", handlePaste);
  }, [editorReady, uploadImageToSupabase, onChange]);

  /* ---------------- Toolbar ---------------- */
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  return (
    <div className="bg-white">
        <ReactQuill
        theme="snow"
        value={value}
        modules={modules}
        formats={[
            "header",
            "bold",
            "italic",
            "underline",
            "strike",
            "color",
            "background",
            "list",
            "bullet",
            "align",
            "link",
            "image",
        ]}
        onChange={(content: string, delta: any, source: any, editor: any) => {
            // ✅ 여기서만 editor 확보
            if (!editorRef.current) {
                editorRef.current = editor.getEditor();
                setEditorReady(true);
            }
            onChange(content);
        }}
        onFocus={(range: any, source: any, editor: any) => {
            if (!editorRef.current) {
                editorRef.current = editor.getEditor();
                setEditorReady(true);
            }
        }}
        style={{ height: 400, marginBottom: 50 }}
        />
    </div>
  );
}
