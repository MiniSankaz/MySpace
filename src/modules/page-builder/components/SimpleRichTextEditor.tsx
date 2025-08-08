"use client";

import React, { useRef, useEffect, useState } from "react";

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string | number;
}

export function SimpleRichTextEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  height = 200,
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === "<br>" || html === "" ? "" : html);
    }
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
    } else {
      setSelectedText("");
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      handleFormat("createLink", url);
    }
  };

  const insertImage = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      handleFormat("insertImage", url);
    }
  };

  return (
    <div className="simple-rich-text-editor">
      {/* Toolbar */}
      <div className="toolbar flex flex-wrap items-center gap-1 p-2 bg-gray-50 border border-gray-300 rounded-t-md">
        {/* Text Format */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
          <button
            type="button"
            onClick={() => handleFormat("bold")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Bold"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat("italic")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Italic"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 4h4M14 4L8 20M6 20h4"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat("underline")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Underline"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v8a5 5 0 0010 0V4M5 20h14"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat("strikeThrough")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Strikethrough"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 12H4m16 0h-8m-4-8v8m0 0v8"
              />
            </svg>
          </button>
        </div>

        {/* Headers */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-300">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleFormat("formatBlock", e.target.value);
                e.target.value = "";
              }
            }}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
          >
            <option value="">ปกติ</option>
            <option value="h1">หัวข้อ 1</option>
            <option value="h2">หัวข้อ 2</option>
            <option value="h3">หัวข้อ 3</option>
            <option value="h4">หัวข้อ 4</option>
            <option value="p">ย่อหน้า</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-300">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleFormat("fontSize", e.target.value);
                e.target.value = "";
              }
            }}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
            title="ขนาดตัวอักษร"
          >
            <option value="">ขนาด</option>
            <option value="1">เล็กมาก (8pt)</option>
            <option value="2">เล็ก (10pt)</option>
            <option value="3">ปกติ (12pt)</option>
            <option value="4">ใหญ่ (14pt)</option>
            <option value="5">ใหญ่มาก (18pt)</option>
            <option value="6">ใหญ่พิเศษ (24pt)</option>
            <option value="7">ใหญ่สุด (36pt)</option>
          </select>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-300">
          <button
            type="button"
            onClick={() => handleFormat("insertUnorderedList")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Bullet List"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat("insertOrderedList")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Numbered List"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 6h10M7 12h10M7 18h10M3 6h.01M3 12h.01M3 18h.01"
              />
            </svg>
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-300">
          <button
            type="button"
            onClick={() => handleFormat("justifyLeft")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Align Left"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6h18M3 12h10M3 18h15"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat("justifyCenter")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Align Center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M7 12h10M5 18h14"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat("justifyRight")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Align Right"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6h18M9 12h12M6 18h15"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleFormat("justifyFull")}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Justify"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6h18M3 12h18M3 18h18"
              />
            </svg>
          </button>
        </div>

        {/* Insert */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-300">
          <button
            type="button"
            onClick={insertLink}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Insert Link"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={insertImage}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Insert Image"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 px-2">
          <div className="relative">
            <input
              type="color"
              onChange={(e) => handleFormat("foreColor", e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              title="Text Color"
            />
            <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center pointer-events-none">
              A
            </span>
          </div>
          <div className="relative">
            <input
              type="color"
              onChange={(e) => handleFormat("backColor", e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              title="Background Color"
            />
            <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center pointer-events-none bg-yellow-200">
              A
            </span>
          </div>
        </div>

        {/* Clear Format */}
        <button
          type="button"
          onClick={() => handleFormat("removeFormat")}
          className="ml-auto p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Clear Formatting"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
            />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
        className={`editor w-full px-3 py-2 border border-gray-300 rounded-b-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none ${
          isActive ? "border-primary-500 ring-1 ring-primary-500" : ""
        }`}
        style={{
          minHeight: typeof height === "number" ? `${height}px` : height,
          maxHeight: "500px",
          overflowY: "auto",
        }}
        data-placeholder={placeholder}
      />

      <style jsx global>{`
        .simple-rich-text-editor .editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
        }

        .simple-rich-text-editor .editor img {
          max-width: 100%;
          height: auto;
          margin: 0.5rem 0;
        }

        .simple-rich-text-editor .editor a {
          color: #3b82f6;
          text-decoration: underline;
        }

        .simple-rich-text-editor .editor blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 0.5rem 0;
          color: #6b7280;
        }

        .simple-rich-text-editor .editor ul,
        .simple-rich-text-editor .editor ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }

        .simple-rich-text-editor .editor h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0;
        }

        .simple-rich-text-editor .editor h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.75rem 0;
        }

        .simple-rich-text-editor .editor h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }

        .simple-rich-text-editor .editor h4 {
          font-size: 1.125rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }

        .simple-rich-text-editor .toolbar {
          border-color: ${isActive ? "#6366f1" : "#d1d5db"};
        }
      `}</style>
    </div>
  );
}
