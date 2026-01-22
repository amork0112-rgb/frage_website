"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useEffect, useCallback } from "react";
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

  const uploadImage = useCallback(async (file: File) => {
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
      if (!editor) return;

      const range = editor.getSelection();
      // If no selection, append to the end
      const index = range ? range.index : editor.getLength();
      
      editor.insertEmbed(index, "image", urlData.publicUrl);
      editor.setSelection(index + 1);
    } catch (e) {
      console.error("Image upload failed", e);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    }
  }, []);

  const imageHandler = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      if (!input.files?.[0]) return;
      await uploadImage(input.files[0]);
    };
  }, [uploadImage]);

  useEffect(() => {
    const handlePaste = async (e: any) => {
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      if (!clipboardData) return;
      
      const items = clipboardData.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            await uploadImage(file);
          }
        }
      }
    };

    const attachListener = () => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.root.addEventListener('paste', handlePaste);
        return true;
      }
      return false;
    };

    if (!attachListener()) {
      const interval = setInterval(() => {
        if (attachListener()) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
    
    return () => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.root.removeEventListener('paste', handlePaste);
      }
    };
  }, [uploadImage]);

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
  }), [imageHandler]);

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
