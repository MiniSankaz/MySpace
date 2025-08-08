"use client";

import React from "react";

interface VideoPlayerProps {
  src?: string;
  type: "youtube" | "vimeo" | "media";
  width?: string;
  height?: string;
  aspectRatio?: string;
}

export function VideoPlayer({
  src,
  type,
  width = "100%",
  height = "auto",
  aspectRatio = "16:9",
}: VideoPlayerProps) {
  if (!src) {
    return (
      <div
        className="bg-gray-200 rounded-lg flex items-center justify-center"
        style={{ aspectRatio }}
      >
        <div className="text-center">
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
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500">No video selected</p>
        </div>
      </div>
    );
  }

  const getEmbedUrl = () => {
    if (type === "youtube") {
      const videoId = extractYouTubeId(src);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } else if (type === "vimeo") {
      const videoId = extractVimeoId(src);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return src;
  };

  const extractYouTubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const extractVimeoId = (url: string) => {
    const regExp = /vimeo.*\/(\d+)/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const embedUrl = getEmbedUrl();

  if (!embedUrl) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">Invalid video URL</p>
      </div>
    );
  }

  if (type === "media") {
    return (
      <div
        className="relative overflow-hidden rounded-lg"
        style={{ width, aspectRatio }}
      >
        <video
          src={embedUrl}
          controls
          className="w-full h-full object-cover"
          style={{ height: height !== "auto" ? height : undefined }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ width, aspectRatio }}
    >
      <iframe
        src={embedUrl}
        className="absolute top-0 left-0 w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
