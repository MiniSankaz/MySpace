'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { MessageContent } from './MessageRenderer';

// Icons as SVG components
const Icons = {
  NewChat: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  More: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Bot: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

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

export const ChatInterfaceEnhanced: React.FC<ChatInterfaceProps> = ({
  sessionId: initialSessionId,
  onSessionIdChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId || '');
  const [userId, setUserId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
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
        let movedSession: SessionInfo | undefined;
        
        movedSession = sessions.find(s => s.sessionId === sessionIdToMove);
        if (movedSession) {
          setSessions(prev => prev.filter(s => s.sessionId !== sessionIdToMove));
        }
        
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
          directMode: true
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


  const renderSessionCard = (session: SessionInfo, isInFolder: boolean = false) => (
    <div
      key={session.sessionId}
      className={`group relative transition-all duration-200 ${isInFolder ? 'ml-4' : ''}`}
      onMouseEnter={() => setHoveredSession(session.sessionId)}
      onMouseLeave={() => setHoveredSession(null)}
    >
      <button
        onClick={() => selectSession(session.sessionId)}
        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
          sessionId === session.sessionId
            ? 'bg-gradient-to-r from-blue-600/20 to-blue-600/10 border-l-3 border-blue-500 shadow-sm'
            : 'hover:bg-gray-800/50'
        }`}
      >
        <div className="font-medium text-sm text-gray-100 truncate pr-12">
          {session.title?.substring(0, 30) || 'New Chat'}
        </div>
        <div className="text-xs text-gray-400 truncate mt-1">
          {session.lastMessage?.substring(0, 40) || 'Start a conversation'}...
        </div>
      </button>
      
      {hoveredSession === session.sessionId && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu(session.sessionId);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-all"
            title="Options"
          >
            <Icons.More />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(session.sessionId);
            }}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-all"
            title="Delete"
          >
            <Icons.Trash />
          </button>
        </div>
      )}
      
      {showMoveMenu === session.sessionId && (
        <div
          ref={moveMenuRef}
          className="absolute right-0 top-8 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 z-50 w-48"
        >
          <button
            onClick={() => moveToFolder(session.sessionId, null)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors text-gray-200"
          >
            Move to Root
          </button>
          <div className="border-t border-gray-700 my-1" />
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => moveToFolder(session.sessionId, folder.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors text-gray-200 flex items-center gap-2"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: folder.color }}
              />
              {folder.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-900/50 backdrop-blur-lg border-r border-gray-700/50 flex flex-col overflow-hidden flex-shrink-0 lg:relative absolute left-0 h-full z-40`}>
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-700/50">
              <button
                onClick={createNewSession}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-medium"
              >
                <Icons.NewChat />
                New Chat
              </button>
            </div>

            {/* Folders Section */}
            <div className="border-b border-gray-700/50">
              <div className="flex justify-between items-center px-4 py-3 bg-gray-800/30">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folders</h3>
                <button
                  onClick={() => setShowNewFolderDialog(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <Icons.Plus />
                  New
                </button>
              </div>
              
              <div className="px-2 py-2 space-y-1">
                {folders.map(folder => (
                  <div key={folder.id}>
                    <div
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/30 cursor-pointer transition-all duration-200 group"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`transition-transform duration-200 ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`}
                        >
                          <Icons.ChevronRight />
                        </span>
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        <span className="text-sm text-gray-200">{folder.name}</span>
                        <span className="text-xs text-gray-500">({folder.conversations?.length || 0})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                      >
                        <Icons.Close />
                      </button>
                    </div>
                    
                    {expandedFolders.has(folder.id) && folder.conversations && (
                      <div className="ml-4 mt-1 space-y-1">
                        {folder.conversations.map(conv => renderSessionCard(conv, true))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chats Section */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex justify-between items-center px-4 py-3 bg-gray-800/30">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Chats</h3>
                {sessions.length > 0 && (
                  <button
                    onClick={() => setClearAllConfirm(true)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="px-2 py-2 space-y-1">
                {loadingSessions ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : sessions.length > 0 ? (
                  sessions.map(session => renderSessionCard(session))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No chats yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header Bar */}
        <div className="bg-gray-900/50 backdrop-blur-lg border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200 text-gray-300 hover:text-white"
          >
            {sidebarOpen ? <Icons.Close /> : <Icons.Menu />}
          </button>
          
          <div className="text-sm text-gray-400">
            AI Assistant
          </div>
          
          <div className="w-10" /> {/* Spacer for center alignment */}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Icons.Bot />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
                  How can I help you today?
                </h2>
                <p className="text-gray-400">
                  Start a conversation by typing a message below
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.id}-${index}`}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`flex gap-3 max-w-full ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-br from-purple-500 to-purple-600'
                    }`}>
                      {message.type === 'user' ? <Icons.User /> : <Icons.Bot />}
                    </div>
                    <div
                      className={`message-bubble ${message.type} px-4 py-3 rounded-2xl overflow-hidden ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                          : 'bg-gray-900 border border-gray-700'
                      }`}
                      style={{ maxWidth: '800px' }}
                    >
                      <MessageContent content={message.content} type={message.type} />
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="flex justify-start animate-fadeIn">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Icons.Bot />
                  </div>
                  <div className="bg-gray-800 px-4 py-3 rounded-2xl border border-gray-700" style={{ maxWidth: '800px' }}>
                    <div className="flex gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-900/30 backdrop-blur">
            <div className="max-w-6xl mx-auto">
              <p className="text-xs text-gray-400 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 text-sm bg-gray-800/50 text-gray-300 rounded-full hover:bg-gray-700/50 transition-all duration-200 border border-gray-700/50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-700/50 bg-gray-900/50 backdrop-blur-lg px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
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
                className="flex-1 bg-gray-800/50 border border-gray-700/50 text-gray-100 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icons.Send />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Create New Folder</h3>
            
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
              autoFocus
            />
            
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Choose a color:</p>
              <div className="flex gap-2">
                {folderColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedFolderColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedFolderColor === color ? 'border-white scale-110' : 'border-transparent'
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
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {clearAllConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">Clear All Chats?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently delete all your chat history. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setClearAllConfirm(false)}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllSessions}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">Delete Chat?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently delete this chat. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSession(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .border-l-3 {
          border-left-width: 3px;
        }
      `}</style>
    </div>
  );
};

export default ChatInterfaceEnhanced;