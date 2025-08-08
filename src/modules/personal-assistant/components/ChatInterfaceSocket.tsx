'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { useSocket } from '../hooks/useSocket';

interface ChatInterfaceSocketProps {
  userId?: string;
  sessionId?: string;
  onSessionIdChange?: (sessionId: string) => void;
}

export const ChatInterfaceSocket: React.FC<ChatInterfaceSocketProps> = ({
  userId = 'user-123',
  sessionId: initialSessionId,
  onSessionIdChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(initialSessionId || `session-${Date.now()}`);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { connected, sendMessage, startTyping, stopTyping } = useSocket({
    userId,
    sessionId,
    onMessage: (message) => {
      setMessages(prev => [...prev, message]);
      if (message.metadata?.suggestions) {
        setSuggestions(message.metadata.suggestions);
      }
    },
    onTyping: () => setOtherUserTyping(true),
    onStopTyping: () => setOtherUserTyping(false)
  });

  useEffect(() => {
    if (!initialSessionId && sessionId) {
      onSessionIdChange?.(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleQuickCommand = (event: CustomEvent) => {
      setInput(event.detail.command);
    };

    window.addEventListener('assistant-command' as any, handleQuickCommand);
    return () => {
      window.removeEventListener('assistant-command' as any, handleQuickCommand);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!input.trim() || !connected) return;

    sendMessage(input);
    setInput('');
    setSuggestions([]);
    stopTyping();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const command = suggestion.split(' - ')[0];
    setInput(command);
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Personal Assistant
            </h2>
            {sessionId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Session: {sessionId}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="mb-2">👋 สวัสดี! ฉันคือผู้ช่วยส่วนตัวของคุณ</p>
            <p className="text-sm">พิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้</p>
            {!connected && (
              <p className="text-sm text-yellow-600 mt-2">
                ⚠️ กำลังเชื่อมต่อ...
              </p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'assistant'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                }`}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(message.content)
                  }}
                />
                <div className="text-xs mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            คำแนะนำ:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={connected ? "พิมพ์ข้อความหรือคำสั่ง..." : "รอการเชื่อมต่อ..."}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!connected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!connected || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ส่ง
          </button>
        </div>
      </div>
    </div>
  );
};