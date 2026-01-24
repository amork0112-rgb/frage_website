"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useCallback, useEffect } from "react";
import "react-quill/dist/quill.snow.css";
import { supabase } from "@/lib/supabase";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false }) as any;

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  // ✅ Quill core instance (for internal usage like paste handler)
  const editorRef = useRef<any>(null);
  // ✅ ReactQuill Component ref (to access getEditor())
  const quillComponentRef = useRef<any>(null);

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

    if (!data?.publicUrl) {
      throw new Error("publicUrl not generated");
    }

    return data.publicUrl;
  }, []);

  /* ---------------- Paste Handler (함수 분리) ---------------- */
  const setupPasteHandler = useCallback(
    (editor: any) => {
      // 중복 바인딩 방지용 플래그 체크
      if (editor.__pasteHandlerAttached) return;
      editor.__pasteHandlerAttached = true;

      const handlePaste = async (e: ClipboardEvent) => {
        const clipboardData = e.clipboardData;
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
    },
    [uploadImageToSupabase, onChange]
  );

  /* ---------------- Initialize Editor ---------------- */
  // ✅ Mount 시점에 getEditor()를 통해 진짜 Quill Core 가져오기
  useEffect(() => {
    if (quillComponentRef.current) {
      try {
        // react-quill v2: component ref -> getEditor() -> Quill instance
        const editor = quillComponentRef.current.getEditor();
        if (editor) {
          editorRef.current = editor;
          setupPasteHandler(editor);
        }
      } catch (error) {
        console.warn("Failed to get editor instance:", error);
      }
    }
  }, [setupPasteHandler]);

  /* ---------------- 이미지 버튼 ---------------- */
  const imageHandler = useCallback(() => {
    // ✅ editorRef 대신 quillComponentRef를 통해 최신 인스턴스 확보 시도
    let editor = editorRef.current;
    
    if (!editor && quillComponentRef.current) {
      try {
        editor = quillComponentRef.current.getEditor();
        editorRef.current = editor;
      } catch (e) {
        console.error("Failed to get editor for image handler");
      }
    }

    if (!editor) {
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
        ref={quillComponentRef} // ✅ Attach ref to component
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
        onChange={(content: string) => {
          // ❌ 여기서 editor 객체를 잡지 않음 (UnprivilegedEditor 문제 방지)
          onChange(content);
        }}
        // onFocus 등에서도 editor 객체 참조 제거
        style={{ height: 400, marginBottom: 50 }}
      />
    </div>
  );
}
