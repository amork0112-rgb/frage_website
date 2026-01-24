//components/Editor.tsx
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

  const uploadImageToSupabase = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop();
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

    console.log("✅ Generated Public URL:", data.publicUrl);
    return data.publicUrl;
  }, []);

  const imageHandler = useCallback(() => {
    console.log("🟢 imageHandler called");
    console.log("quillRef check:", quillRef.current);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();

    input.onchange = async () => {
      console.log("🟢 file selected", input.files?.[0]);
      const file = input.files?.[0];
      if (!file) return;
      
      try {
        const url = await uploadImageToSupabase(file);
        const editor = quillRef.current?.getEditor?.();
        
        if (!editor) {
          console.error("❌ quill editor not found");
          return;
        }

        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();
        
        editor.insertEmbed(index, "image", url);
        editor.setSelection(index + 1);

        // State synchronization
        onChange(editor.root.innerHTML);
      } catch (e) {
        console.error("Image upload failed", e);
        alert("이미지 업로드 중 오류가 발생했습니다: " + (e as any).message);
      }
    };
  }, [uploadImageToSupabase, onChange]);

  useEffect(() => {
    // Register LinkCard Blot
    const registerBlot = async () => {
      const { default: ReactQuill } = await import("react-quill");
      const Quill = ReactQuill.Quill;
      const BlockEmbed = Quill.import('blots/block/embed');
      
      class LinkCardBlot extends BlockEmbed {
        static create(value: any) {
          const node = super.create();
          node.setAttribute('href', value.url);
          node.setAttribute('target', '_blank');
          node.setAttribute('contenteditable', 'false');
          // Add classes for styling
          node.className = 'link-card block border border-slate-200 rounded-xl overflow-hidden mb-4 hover:bg-slate-50 no-underline transition-colors cursor-pointer text-left';
          
          const container = document.createElement('div');
          container.className = 'flex flex-col sm:flex-row';
          
          if (value.image) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'w-full sm:w-48 h-32 bg-cover bg-center bg-no-repeat bg-slate-200 flex-shrink-0';
            imgDiv.style.backgroundImage = `url(${value.image})`;
            container.appendChild(imgDiv);
          }
          
          const infoDiv = document.createElement('div');
          infoDiv.className = 'p-4 flex-1 min-w-0 flex flex-col justify-center';
          
          const title = document.createElement('div');
          title.className = 'font-bold text-slate-800 line-clamp-1 mb-1 text-base';
          title.textContent = value.title;
          
          const desc = document.createElement('div');
          desc.className = 'text-sm text-slate-500 line-clamp-2 mb-2 leading-relaxed';
          desc.textContent = value.description;
          
          const domain = document.createElement('div');
          domain.className = 'text-xs text-slate-400 font-medium';
          domain.textContent = value.domain;
          
          infoDiv.appendChild(title);
          infoDiv.appendChild(desc);
          infoDiv.appendChild(domain);
          container.appendChild(infoDiv);
          
          node.appendChild(container);
          return node;
        }
        
        static value(node: any) {
          return {
            url: node.getAttribute('href'),
            title: node.querySelector('.font-bold')?.textContent,
            description: node.querySelector('.text-sm')?.textContent,
            image: node.querySelector('.bg-cover')?.style.backgroundImage?.slice(5, -2),
            domain: node.querySelector('.text-xs')?.textContent
          };
        }
      }
      LinkCardBlot.blotName = 'link-card';
      LinkCardBlot.tagName = 'a';
      Quill.register(LinkCardBlot);
    };
    registerBlot();

    const handlePaste = async (e: any) => {
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      if (!clipboardData) return;
      
      // 1. Handle Image Paste
      const file = clipboardData.files?.[0];
      if (file && file.type.startsWith('image/')) {
        e.preventDefault();
        try {
          const url = await uploadImageToSupabase(file);
          const editor = quillRef.current?.getEditor?.();
          if (editor) {
             const range = editor.getSelection();
             const index = range ? range.index : editor.getLength();
             editor.insertEmbed(index, "image", url);
             editor.setSelection(index + 1);
             onChange(editor.root.innerHTML);
          }
        } catch (e) {
          console.error("Paste upload failed", e);
          alert("이미지 붙여넣기 실패: " + (e as any).message);
        }
        return;
      }

      // 2. Handle URL Paste
      const text = clipboardData.getData('text/plain');
      const urlRegex = /^(https?:\/\/[^\s]+)$/;
      
      if (text && urlRegex.test(text.trim())) {
        e.preventDefault();
        const url = text.trim();
        
        // Show loading state or placeholder?
        // For now, just wait for API
        try {
          // Insert loading text
          const editor = quillRef.current?.getEditor?.();
          const range = editor?.getSelection();
          const index = range ? range.index : editor?.getLength();
          
          if (editor) {
             editor.insertText(index, "Link preview generating...", { color: '#888', italic: true });
          }

          const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          
          if (editor) {
            // Remove loading text
            editor.deleteText(index, "Link preview generating...".length);
            
            if (data.error) {
               // Fallback to normal link
               editor.insertText(index, url, 'link', url);
            } else {
               // Insert Link Card
               editor.insertEmbed(index, 'link-card', data);
               editor.insertText(index + 1, '\n'); // Add newline after card
               editor.setSelection(index + 2);
            }
            onChange(editor.root.innerHTML);
          }
        } catch (err) {
          console.error("Link preview failed", err);
          // Fallback
          const editor = quillRef.current?.getEditor?.();
          const range = editor?.getSelection();
          if (editor && range) {
             editor.insertText(range.index, url, 'link', url);
          }
        }
      }
    };

    const attachListener = () => {
      const editor = quillRef.current?.getEditor?.();
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
      const editor = quillRef.current?.getEditor?.();
      if (editor) {
        editor.root.removeEventListener('paste', handlePaste);
      }
    };
  }, [uploadImageToSupabase]);

  const modules = {
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
  };

  const formats = [
    "header",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "list", "bullet",
    "align",
    "link", "image",
    "link-card"
  ];

  return (
    <div className="bg-white">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        style={{ height: "400px", marginBottom: "50px" }}
      />
    </div>
  );
}
