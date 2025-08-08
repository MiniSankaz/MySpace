"use client";

import React, { useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = 200,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !editorRef.current) return;

    // Import Quill dynamically (client-side only)
    import("quill")
      .then((QuillModule) => {
        const Quill = QuillModule.default;

        // Check if Quill is already initialized
        const existingEditor = (editorRef.current as any)?.__quill;
        if (existingEditor) {
          return;
        }

        const quill = (new Quill(editorRef.current, {
          theme: "snow",
          placeholder: placeholder || "Enter content...",
          modules: {
            toolbar: [
              [{ header: [1, 2, 3, 4, 5, 6, false] }],
              ["bold", "italic", "underline", "strike"],
              ["blockquote", "code-block"],
              [{ list: "ordered" }, { list: "bullet" }],
              [{ script: "sub" }, { script: "super" }],
              [{ indent: "-1" }, { indent: "+1" }],
              [{ direction: "rtl" }],
              [{ size: ["small", false, "large", "huge"] }],
              [{ color: [] }, { background: [] }],
              [{ font: [] }],
              [{ align: [] }],
              ["link", "image", "video"],
              ["clean"],
            ],
          },
        })(
          // Store quill instance
          editorRef.current as any,
        ).__quill = quill);

        // Set initial content
        if (value) {
          quill.root.innerHTML = value;
        }

        // Handle changes
        quill.on("text-change", () => {
          const html = quill.root.innerHTML;
          onChange(html === "<p><br></p>" ? "" : html);
        });
      })
      .catch((err) => {
        console.error("Failed to load Quill:", err);
      });
  }, [isClient, value, onChange, placeholder]);

  // Fallback to textarea if Quill is not available
  if (!isClient) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
        style={{ minHeight: height }}
        rows={8}
      />
    );
  }

  return (
    <div className="rich-text-editor">
      <div
        ref={editorRef}
        style={{ minHeight: height }}
        className="bg-white rounded-md"
      />
      <style jsx global>{`
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          border: 1px solid #d1d5db;
          border-bottom: none;
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          border: 1px solid #d1d5db;
          font-family: inherit;
        }
        .rich-text-editor .ql-editor {
          min-height: ${typeof height === "number" ? height + "px" : height};
        }
        .rich-text-editor .ql-editor:focus {
          outline: none;
        }
        .rich-text-editor .ql-toolbar:focus-within + .ql-container,
        .rich-text-editor .ql-container:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 1px #6366f1;
        }
      `}</style>
    </div>
  );
}
