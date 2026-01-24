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

  /* ---------------- Editor Instance Capture Helper ---------------- */
  // ✅ 인스턴스 확보 로직을 별도 함수로 분리하여 여러 시점에 재사용
  const captureEditorInstance = useCallback(() => {
    if (editorRef.current) return; // 이미 확보됨
    if (!quillComponentRef.current) return; // 컴포넌트 Ref 없음

    try {
      // react-quill v2: component ref -> getEditor() -> Quill instance
      if (typeof quillComponentRef.current.getEditor !== 'function') return;
      
      const editor = quillComponentRef.current.getEditor();
      if (editor) {
        editorRef.current = editor;
        setupPasteHandler(editor);
        console.log("✅ Editor instance captured successfully");
      }
    } catch (e) {
      // 아직 초기화 안됨 (무시)
    }
  }, [setupPasteHandler]);

  /* ---------------- Initialize Editor (Callback Ref) ---------------- */
  const handleQuillRef = useCallback((element: any) => {
    quillComponentRef.current = element;
    // 마운트 직후 즉시 시도
    captureEditorInstance();
  }, [captureEditorInstance]);

  // ✅ Effect: 마운트 후 약간의 딜레이가 있거나 리렌더링 시에도 재시도
  useEffect(() => {
    captureEditorInstance();
    // 안전장치: 약간의 지연 후 한 번 더 시도 (동적 로딩 타이밍 이슈 방지)
    const timer = setTimeout(captureEditorInstance, 100);
    return () => clearTimeout(timer);
  }, [captureEditorInstance]);

  /* ---------------- 이미지 버튼 ---------------- */
  const imageHandler = useCallback(() => {
    // 1. 실행 직전 재시도 (가장 중요)
    captureEditorInstance();

    const editor = editorRef.current;
    if (!editor) {
      alert("에디터가 로딩 중입니다. 잠시 후 다시 시도해주세요.");
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
  }, [uploadImageToSupabase, onChange, captureEditorInstance]);

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
        ref={handleQuillRef}
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
          onChange(content);
          // ✅ 변경 시점에도 인스턴스 체크 (혹시 놓쳤을 경우 대비)
          captureEditorInstance();
        }}
        onFocus={() => {
          // ✅ 포커스 시점에도 인스턴스 체크
          captureEditorInstance();
        }}
        style={{ height: 400, marginBottom: 50 }}
      />
    </div>
  );
}
