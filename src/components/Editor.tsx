"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import "react-quill/dist/quill.snow.css";
import { supabase } from "@/lib/supabase";

// Dynamic import to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false }) as any;

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
      const file = input.files ? input.files[0] : null;
      if (file) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `notices/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          
          // Upload to 'images' bucket
          const { error: uploadError } = await supabase.storage
            .from("images")
            .upload(fileName, file);

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("images")
            .getPublicUrl(fileName);

          const editor = quillRef.current?.getEditor();
          const range = editor?.getSelection();
          if (editor && range) {
            editor.insertEmbed(range.index, "image", publicUrl);
          }
        } catch (error) {
          console.error("Image upload failed:", error);
          alert("이미지 업로드에 실패했습니다.");
        }
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
