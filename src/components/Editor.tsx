"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import "react-quill/dist/quill.snow.css";

// Dynamic import to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false }) as any;

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  const quillRef = useRef<any>(null);

  const imageHandler = () => {
    const url = window.prompt("이미지 URL을 입력하세요:");
    if (url) {
      const editor = quillRef.current?.getEditor();
      const range = editor?.getSelection();
      if (editor && range) {
        editor.insertEmbed(range.index, "image", url);
      }
    }
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
