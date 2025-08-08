"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import { useTranslation } from "@/modules/i18n/hooks/useTranslation";

interface MediaSelectorProps {
  value?: string | string[];
  onChange: (value: any, url?: string) => void;
  type?: "image" | "video" | "all";
  multiple?: boolean;
}

export function MediaSelector({
  value,
  onChange,
  type = "all",
  multiple = false,
}: MediaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<string[]>(
    Array.isArray(value) ? value : value ? [value] : [],
  );

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen, page, type]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const mimeType =
        type === "image" ? "image/" : type === "video" ? "video/" : undefined;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
        ...(mimeType && { mimeType }),
        isPublic: "true",
      });

      const response = await fetch(`/api/admin/media?${params}`);
      const result = await response.json();

      setMedia(result.data || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (error) {
      console.error("Failed to load media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (mediaItem: any) => {
    if (multiple) {
      const newSelection = selectedMedia.includes(mediaItem.id)
        ? selectedMedia.filter((id) => id !== mediaItem.id)
        : [...selectedMedia, mediaItem.id];
      setSelectedMedia(newSelection);
    } else {
      setSelectedMedia([mediaItem.id]);
      onChange(mediaItem.id, mediaItem.url);
      setIsOpen(false);
    }
  };

  const handleConfirmMultiple = () => {
    const selectedItems = media.filter((item) =>
      selectedMedia.includes(item.id),
    );
    onChange(
      selectedMedia.map((id) => {
        const item = selectedItems.find((m) => m.id === id);
        return { id, url: item?.url };
      }),
    );
    setIsOpen(false);
  };

  const getSelectedCount = () => {
    if (Array.isArray(value)) return value.length;
    return value ? 1 : 0;
  };

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm hover:border-primary-300 focus:border-primary-500 focus:ring-primary-500 focus:ring-1 text-left"
        >
          <span className="text-gray-700">
            {getSelectedCount() > 0
              ? `${getSelectedCount()} ${type}(s) selected`
              : `Select ${type}${multiple ? "(s)" : ""}`}
          </span>
        </button>

        {/* Preview selected media */}
        {!multiple && value && typeof value === "string" && (
          <div className="mt-2">
            <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden">
              {type === "image" ? (
                <Image
                  src={value}
                  alt="Selected"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Video selected
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="xl">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Select {type === "all" ? "Media" : type}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                {media.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`
                      relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                      ${
                        selectedMedia.includes(item.id)
                          ? "border-primary-500 ring-2 ring-primary-200"
                          : "border-gray-200 hover:border-gray-300"
                      }
                    `}
                  >
                    <div className="relative h-32 bg-gray-100">
                      {item.mimeType.startsWith("image/") ? (
                        <Image
                          src={item.thumbnailUrl || item.url}
                          alt={item.alt || item.filename}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      {selectedMedia.includes(item.id) && (
                        <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate">
                        {item.filename}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                {multiple && (
                  <button
                    onClick={handleConfirmMultiple}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Select {selectedMedia.length} item(s)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
