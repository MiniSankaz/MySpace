'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';

interface SessionInfo {
  sessionId: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: Date;
  folderId?: string | null;
}

interface FolderInfo {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  conversationCount?: number;
  conversations?: SessionInfo[];
  expanded?: boolean;
}

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionIdChange?: (sessionId: string) => void;
}

export const ChatInterfaceWithFolders: React.FC<ChatInterfaceProps> = ({
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
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderColor, setSelectedFolderColor] = useState('#3B82F6');
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  const folderColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#6B7280', // gray
  ];

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserId(user.id);
    }
    
    loadSessions();
    loadFolders();
    
    // Auto-focus input on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadConversationHistory();
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close move menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setShowMoveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
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

  const loadFolders = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/assistant/folders', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Load conversations for each folder
        const foldersWithConversations = await Promise.all(
          data.folders.map(async (folder: FolderInfo) => {
            const folderResponse = await fetch(`/api/assistant/folders/${folder.id}`, {
              headers: {
                'Authorization': token ? `Bearer ${token}` : ''
              }
            });
            const folderData = await folderResponse.json();
            return {
              ...folder,
              conversations: folderData.success ? folderData.folder.conversations : []
            };
          })
        );
        setFolders(foldersWithConversations);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadConversationHistory = async () => {
    try {
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
        setSessions(prev => prev.filter(s => s.sessionId !== sessionIdToDelete));
        
        // Also remove from folders
        setFolders(prev => prev.map(folder => ({
          ...folder,
          conversations: folder.conversations?.filter(c => c.sessionId !== sessionIdToDelete)
        })));
        
        if (sessionId === sessionIdToDelete) {
          createNewSession();
        }
        
        setDeleteConfirm(null);
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
        setSessions([]);
        setFolders(prev => prev.map(folder => ({ ...folder, conversations: [] })));
        createNewSession();
        setClearAllConfirm(false);
      }
    } catch (error) {
      console.error('Error clearing sessions:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/assistant/folders', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName,
          color: selectedFolderColor
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setFolders(prev => [...prev, { ...data.folder, conversations: [] }]);
        setNewFolderName('');
        setShowNewFolderDialog(false);
        setSelectedFolderColor('#3B82F6');
      } else {
        alert(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? Conversations will be moved to root.')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/assistant/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const data = await response.json();
      
      if (data.success) {
        const folder = folders.find(f => f.id === folderId);
        if (folder?.conversations) {
          setSessions(prev => [...prev, ...folder.conversations]);
        }
        setFolders(prev => prev.filter(f => f.id !== folderId));
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const moveToFolder = async (sessionIdToMove: string, targetFolderId: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/assistant/sessions/${sessionIdToMove}/move`, {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folderId: targetFolderId })
      });

      const data = await response.json();
      
      if (data.success) {
        // Find the session
        let movedSession: SessionInfo | undefined;
        
        // Check in root sessions
        movedSession = sessions.find(s => s.sessionId === sessionIdToMove);
        if (movedSession) {
          setSessions(prev => prev.filter(s => s.sessionId !== sessionIdToMove));
        }
        
        // Check in folders
        if (!movedSession) {
          folders.forEach(folder => {
            const found = folder.conversations?.find(c => c.sessionId === sessionIdToMove);
            if (found) movedSession = found;
          });
          
          setFolders(prev => prev.map(folder => ({
            ...folder,
            conversations: folder.conversations?.filter(c => c.sessionId !== sessionIdToMove)
          })));
        }
        
        // Add to target
        if (movedSession) {
          if (targetFolderId) {
            setFolders(prev => prev.map(folder => 
              folder.id === targetFolderId
                ? { ...folder, conversations: [...(folder.conversations || []), movedSession!] }
                : folder
            ));
          } else {
            setSessions(prev => [...prev, movedSession!]);
          }
        }
        
        setShowMoveMenu(null);
        loadSessions();
        loadFolders();
      }
    } catch (error) {
      console.error('Error moving session:', error);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
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

        if (data.response.suggestions?.length > 0) {
          setSuggestions(data.response.suggestions);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
      setIsTyping(false);
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

  const renderSessionCard = (session: SessionInfo, isInFolder: boolean = false) => (
    <div
      key={session.sessionId}
      className="relative group"
      onMouseEnter={() => setHoveredSession(session.sessionId)}
      onMouseLeave={() => setHoveredSession(null)}
    >
      <button
        onClick={() => selectSession(session.sessionId)}
        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
          sessionId === session.sessionId
            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-600'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        } ${isInFolder ? 'ml-4' : ''}`}
      >
        <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate pr-12">
          {session.title?.substring(0, 30) || 'Untitled Chat'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
          {session.lastMessage?.substring(0, 40) || 'No messages'}...
        </div>
      </button>
      
      {/* Action buttons */}
      {hoveredSession === session.sessionId && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {/* Move/Options button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu(session.sessionId);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Options"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(session.sessionId);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
            title="Delete chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Move menu dropdown */}
      {showMoveMenu === session.sessionId && (
        <div
          ref={moveMenuRef}
          className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 w-48"
        >
          <button
            onClick={() => moveToFolder(session.sessionId, null)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Move to Root
            </span>
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => moveToFolder(session.sessionId, folder.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: folder.color }}
                />
                {folder.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full relative z-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 assistant-sidebar flex flex-col overflow-hidden flex-shrink-0`}>
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

            {/* Folders Section */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="section-header">
                <h3 className="section-title">Folders</h3>
                <button
                  onClick={() => setShowNewFolderDialog(true)}
                  className="new-folder-button"
                >
                  + New Folder
                </button>
              </div>
              
              <div className="space-y-1">
                {folders.map(folder => (
                  <div key={folder.id}>
                    <div
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{folder.name}</span>
                        <span className="text-xs text-gray-500">({folder.conversations?.length || 0})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {expandedFolders.has(folder.id) && folder.conversations && (
                      <div className="ml-4">
                        {folder.conversations.map(conv => renderSessionCard(conv, true))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Current Chats Section */}
            <div className="flex-1 overflow-y-auto scrollbar-custom">
              <div className="section-header">
                <h3 className="section-title">Current Chats</h3>
                {sessions.length > 0 && (
                  <button
                    onClick={() => setClearAllConfirm(true)}
                    className="clear-all-button"
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
                  {sessions.map(session => renderSessionCard(session))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No chats yet</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative message-area">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-4 top-4 z-10 p-2 bg-gray-800/80 backdrop-blur rounded-lg shadow-md hover:shadow-lg transition-all hover:bg-gray-700/80"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
          </svg>
        </button>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-custom">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start a conversation by typing a message below
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.id}-${index}`}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`message-bubble ${message.type}`}
                  >
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
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
        <div className="input-area">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 input-textarea"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="send-button"
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

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Create New Folder
            </h3>
            
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Choose a color:</p>
              <div className="flex gap-2">
                {folderColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedFolderColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedFolderColor === color ? 'border-gray-900 dark:border-gray-100' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                  setSelectedFolderColor('#3B82F6');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

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

export default ChatInterfaceWithFolders;