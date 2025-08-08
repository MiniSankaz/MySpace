"use client";

import React, { useState } from "react";
import Image from "next/image";

interface ImageGalleryProps {
  images: Array<{ id: string; url: string }>;
  layout: "grid" | "masonry" | "carousel" | "slideshow";
  columns: number;
  gap: string;
}

export function ImageGallery({
  images,
  layout,
  columns,
  gap,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-gray-500">No images in gallery</p>
      </div>
    );
  }

  if (layout === "carousel" || layout === "slideshow") {
    return (
      <div className="relative">
        <div
          className="relative overflow-hidden rounded-lg"
          style={{ aspectRatio: "16/9" }}
        >
          <Image
            src={images[currentIndex].url}
            alt={`Gallery image ${currentIndex + 1}`}
            fill
            className="object-cover"
          />
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentIndex((prev) =>
                  prev === 0 ? images.length - 1 : prev - 1,
                )
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() =>
                setCurrentIndex((prev) =>
                  prev === images.length - 1 ? 0 : prev + 1,
                )
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? "bg-white w-8" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (layout === "masonry") {
    return (
      <div
        className="columns-1 md:columns-2 lg:columns-3 xl:columns-4"
        style={{ columnGap: gap }}
      >
        {images.map((image, index) => (
          <div key={image.id} className="break-inside-avoid mb-4">
            <div className="relative overflow-hidden rounded-lg">
              <Image
                src={image.url}
                alt={`Gallery image ${index + 1}`}
                width={400}
                height={300}
                className="w-full h-auto"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default grid layout
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`}
      style={{ gap }}
    >
      {images.map((image, index) => (
        <div
          key={image.id}
          className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
        >
          <Image
            src={image.url}
            alt={`Gallery image ${index + 1}`}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      ))}
    </div>
  );
}
