"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import "react-quill/dist/quill.snow.css";

// Dynamic import to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false }) as any;

import { supabase } from "@/lib/supabase";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  const quillRef = useRef<any>(null);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      if (!input.files?.[0]) return;
      const file = input.files[0];
      const fileName = `notices/${Date.now()}-${file.name}`;

      try {
        const { error } = await supabase.storage
          .from("notice-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          console.error("Upload error:", error);
          alert("이미지 업로드 실패: " + error.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("notice-images")
          .getPublicUrl(fileName);

        const editor = quillRef.current?.getEditor();
        const range = editor?.getSelection();
        if (editor && range) {
          editor.insertEmbed(range.index, "image", urlData.publicUrl);
        }
      } catch (e) {
        console.error("Image upload failed", e);
        alert("이미지 업로드 중 오류가 발생했습니다.");
      }
    };
  };

  const modules = useMemo(() => ({
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
  }), []);

  return (
    <div className="bg-white">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        style={{ height: "400px", marginBottom: "50px" }}
      />
    </div>
  );
}
