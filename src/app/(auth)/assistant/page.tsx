"use client";

import React, { useState } from "react";
import { ChatInterfaceWithFolders } from "@/modules/personal-assistant/components/ChatInterfaceWithFolders";
import "./assistant.module.scss";

export default function AssistantPage() {
  const [sessionId, setSessionId] = useState<string>("");

  return (
    <div className="assistant-page">
      <ChatInterfaceWithFolders
        sessionId={sessionId}
        onSessionIdChange={setSessionId}
      />
    </div>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  command: string;
}

function QuickAction({ icon, label, command }: QuickActionProps) {
  const handleClick = () => {
    // ส่ง event เพื่อใส่คำสั่งใน input
    const event = new CustomEvent("assistant-command", {
      detail: { command },
    });
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </button>
  );
}
