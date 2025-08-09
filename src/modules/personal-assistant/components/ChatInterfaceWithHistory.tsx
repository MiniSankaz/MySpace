'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';

interface SessionInfo {
  sessionId: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: Date;
}

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionIdChange?: (sessionId: string) => void;
}

export const ChatInterfaceWithHistory: React.FC<ChatInterfaceProps> = ({
  sessionId: initialSessionId,
  onSessionIdChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId || '');
  const [userId, setUserId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [directMode, setDirectMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Get authenticated user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserId(user.id);
    }
    
    // Load sessions only if user is authenticated
    loadSessions();
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadConversationHistory();
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      // Get access token for authentication
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/assistant/sessions', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadConversationHistory = async () => {
    try {
      // Get access token for authentication
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/assistant/chat?sessionId=${sessionId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const createNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    setSuggestions([]);
    onSessionIdChange?.(newSessionId);
  };

  const selectSession = (selectedSessionId: string) => {
    setSessionId(selectedSessionId);
    onSessionIdChange?.(selectedSessionId);
  };

  const deleteSession = async (sessionIdToDelete: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/assistant/sessions/${sessionIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove from sessions list
        setSessions(prev => prev.filter(s => s.sessionId !== sessionIdToDelete));
        
        // If deleted session was active, create new session
        if (sessionId === sessionIdToDelete) {
          createNewSession();
        }
        
        // Close confirmation dialog
        setDeleteConfirm(null);
      } else {
        console.error('Failed to delete session:', data.error);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const clearAllSessions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/assistant/sessions/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Clear sessions list
        setSessions([]);
        
        // Create new session
        createNewSession();
        
        // Close confirmation dialog
        setClearAllConfirm(false);
      } else {
        console.error('Failed to clear sessions:', data.error);
      }
    } catch (error) {
      console.error('Error clearing sessions:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      userId: 'user',
      content: input,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setSuggestions([]);
    setIsTyping(true);

    try {
      // Get access token for authentication
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId || undefined,
          directMode
        })
      });

      const data = await response.json();

      if (data.success) {
        if (!sessionId || sessionId !== data.sessionId) {
          setSessionId(data.sessionId);
          onSessionIdChange?.(data.sessionId);
          // Reload sessions to include new one
          loadSessions();
        }

        const assistantMessage: Message = {
          id: data.messageId || `assistant-${Date.now()}`,
          userId: 'assistant',
          content: data.response.message,
          type: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (data.response.suggestions) {
          setSuggestions(data.response.suggestions);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        userId: 'system',
        content: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลข้อความของคุณ',
        type: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto my-2"><code>$1</code></pre>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative z-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden flex-shrink-0`}>
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={createNewSession}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Recent Chats</h3>
                {sessions.length > 0 && (
                  <button
                    onClick={() => setClearAllConfirm(true)}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Clear all chats"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {loadingSessions ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((session, index) => (
                    <div
                      key={`${session.sessionId}-${index}`}
                      className={`relative group`}
                      onMouseEnter={() => setHoveredSession(session.sessionId)}
                      onMouseLeave={() => setHoveredSession(null)}
                    >
                      <button
                        onClick={() => selectSession(session.sessionId)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          sessionId === session.sessionId
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate pr-8">
                          {session.title?.substring(0, 30) || 'Untitled Chat'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {session.lastMessage?.substring(0, 40) || 'No messages'}...
                        </div>
                      </button>
                      
                      {/* Delete button */}
                      {hoveredSession === session.sessionId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(session.sessionId);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete chat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No previous chats</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Personal AI Assistant
                  </h1>
                  {sessionId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Session: {sessionId.substring(0, 20)}...
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={directMode}
                    onChange={(e) => setDirectMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Claude Direct
                  </span>
                </label>
                <button
                  onClick={() => {
                    setMessages([]);
                    setSuggestions([]);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div style={{ maxWidth: '55rem' }} className="mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  สวัสดี! พร้อมช่วยเหลือคุณ
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  เริ่มต้นการสนทนาด้วยการพิมพ์ข้อความด้านล่าง
                </p>
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
                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.type === 'assistant'
                        ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-600'
                        : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <div
                      className="text-sm"
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(message.content)
                      }}
                    />
                    <div className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 px-4 py-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion.split(' - ')[0])}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyPress={handleKeyPress}
                placeholder="พิมพ์ข้อความ..."
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={1}
                style={{
                  minHeight: '48px',
                  maxHeight: '120px'
                }}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={`px-5 py-3 rounded-xl font-medium transition-all ${
                  loading || !input.trim()
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Dialog */}
      {clearAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Clear All Chats?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete all your chat history? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setClearAllConfirm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllSessions}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Delete Chat?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this chat? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSession(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterfaceWithHistory;