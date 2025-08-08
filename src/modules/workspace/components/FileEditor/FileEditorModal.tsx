'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { customDarkTheme, customLightTheme } from './themes';
import Editor from '@monaco-editor/react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  extension?: string;
}

interface FileEditorModalProps {
  file: FileNode | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const FileEditorModal: React.FC<FileEditorModalProps> = ({
  file,
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (file?.content) {
      setContent(file.content);
      setOriginalContent(file.content);
      setHasChanges(false);
    }
  }, [file]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Lock scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        handleClose();
      }
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && hasChanges) {
          handleSave();
        }
      }
      // Cmd/Ctrl + E to toggle edit mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setIsEditing(!isEditing);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, hasChanges]);

  const handleSave = async () => {
    if (!file || !hasChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          path: '.' + file.path,
          content: content
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('File saved successfully');
        setOriginalContent(content);
        setHasChanges(false);
        setIsEditing(false);
      } else {
        toast.error(data.error || 'Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
        setIsEditing(false);
        setContent(originalContent);
      }
    } else {
      onClose();
      setIsEditing(false);
    }
  };

  const getFileIcon = () => {
    const ext = file?.extension?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return '📘';
      case 'js':
      case 'jsx':
        return '📙';
      case 'css':
      case 'scss':
        return '🎨';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'html':
        return '🌐';
      case 'svg':
      case 'png':
      case 'jpg':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const getMonacoLanguage = () => {
    const ext = file?.extension?.toLowerCase();
    const name = file?.name?.toLowerCase();
    
    // Check special filenames first
    if (name === 'dockerfile') return 'dockerfile';
    if (name === 'makefile') return 'makefile';
    if (name === '.gitignore') return 'plaintext';
    if (name === '.env' || name?.startsWith('.env.')) return 'shell';
    
    switch (ext) {
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'mjs':
      case 'cjs':
        return 'javascript';
      case 'jsx':
        return 'javascript';
      case 'css':
        return 'css';
      case 'scss':
      case 'sass':
        return 'scss';
      case 'less':
        return 'less';
      case 'json':
      case 'jsonc':
        return 'json';
      case 'md':
      case 'mdx':
        return 'markdown';
      case 'html':
      case 'htm':
        return 'html';
      case 'xml':
      case 'svg':
        return 'xml';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'py':
      case 'pyw':
        return 'python';
      case 'rb':
        return 'ruby';
      case 'php':
        return 'php';
      case 'java':
        return 'java';
      case 'c':
        return 'c';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'cs':
        return 'csharp';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'swift':
        return 'swift';
      case 'kt':
      case 'kts':
        return 'kotlin';
      case 'sql':
        return 'sql';
      case 'sh':
      case 'bash':
      case 'zsh':
        return 'shell';
      case 'ps1':
        return 'powershell';
      case 'dockerfile':
        return 'dockerfile';
      case 'graphql':
      case 'gql':
        return 'graphql';
      case 'vue':
        return 'vue';
      default:
        return 'plaintext';
    }
  };

  const getLanguageMode = () => {
    const ext = file?.extension?.toLowerCase();
    const name = file?.name?.toLowerCase();
    
    // Check special filenames first
    if (name === 'dockerfile') return 'docker';
    if (name === 'makefile') return 'makefile';
    if (name === '.gitignore') return 'gitignore';
    if (name === '.env' || name?.startsWith('.env.')) return 'bash';
    
    switch (ext) {
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'tsx';
      case 'js':
      case 'mjs':
      case 'cjs':
        return 'javascript';
      case 'jsx':
        return 'jsx';
      case 'css':
        return 'css';
      case 'scss':
      case 'sass':
        return 'scss';
      case 'less':
        return 'less';
      case 'json':
      case 'jsonc':
        return 'json';
      case 'md':
      case 'mdx':
        return 'markdown';
      case 'html':
      case 'htm':
        return 'html';
      case 'xml':
      case 'svg':
        return 'xml';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'toml':
        return 'toml';
      case 'py':
      case 'pyw':
        return 'python';
      case 'rb':
        return 'ruby';
      case 'php':
        return 'php';
      case 'java':
        return 'java';
      case 'c':
        return 'c';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'cs':
        return 'csharp';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'swift':
        return 'swift';
      case 'kt':
      case 'kts':
        return 'kotlin';
      case 'dart':
        return 'dart';
      case 'sql':
        return 'sql';
      case 'sh':
      case 'bash':
      case 'zsh':
        return 'bash';
      case 'ps1':
        return 'powershell';
      case 'r':
        return 'r';
      case 'lua':
        return 'lua';
      case 'vim':
        return 'vim';
      case 'dockerfile':
        return 'docker';
      case 'prisma':
        return 'graphql';
      case 'graphql':
      case 'gql':
        return 'graphql';
      case 'vue':
        return 'vue';
      default:
        return 'plaintext';
    }
  };

  if (!isOpen || !file) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 z-50"
          >
            <div className={`h-full rounded-xl shadow-2xl flex flex-col overflow-hidden ${
              theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon()}</span>
                  <div>
                    <h2 className={`text-lg font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {file.name}
                    </h2>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {file.path}
                    </p>
                  </div>
                  {hasChanges && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                      Modified
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setContent(originalContent);
                          setIsEditing(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          hasChanges && !isSaving
                            ? theme === 'dark'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                            : theme === 'dark'
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleClose}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-400'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex">
                {/* Line Numbers */}
                <div className={`select-none px-4 py-4 text-right border-r overflow-y-hidden flex-shrink-0 ${
                  theme === 'dark' 
                    ? 'bg-gray-850 border-gray-700 text-gray-500' 
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                } text-sm font-mono`}
                style={{ minWidth: '3.5rem' }}>
                  {content.split('\n').map((_, index) => (
                    <div key={index} className="leading-6 hover:text-blue-500 transition-colors">
                      {index + 1}
                    </div>
                  ))}
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-hidden">
                  {isEditing ? (
                    <Editor
                      height="100%"
                      language={getMonacoLanguage()}
                      value={content}
                      onChange={(value) => setContent(value || '')}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                        lineHeight: 24,
                        padding: { top: 16, bottom: 16 },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        folding: true,
                        lineNumbers: 'off',
                        renderLineHighlight: 'all',
                        bracketPairColorization: {
                          enabled: true
                        },
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                        contextmenu: true,
                        mouseWheelZoom: true,
                        'bracketPairColorization.enabled': true,
                        'semanticHighlighting.enabled': true
                      }}
                      onMount={(editor, monaco) => {
                        // Define custom themes
                        monaco.editor.defineTheme('custom-dark', {
                          base: 'vs-dark',
                          inherit: true,
                          rules: [
                            { token: 'comment', fontStyle: 'italic', foreground: '7C7C7C' },
                            { token: 'keyword', foreground: 'C678DD' },
                            { token: 'string', foreground: '98C379' },
                            { token: 'number', foreground: 'D19A66' },
                            { token: 'type', foreground: 'E6C07B' },
                            { token: 'function', foreground: '61AFEF' },
                            { token: 'variable', foreground: 'E06C75' },
                            { token: 'constant', foreground: 'D19A66' },
                            { token: 'parameter', foreground: 'ABB2BF' },
                            { token: 'property', foreground: '96CBFE' },
                            { token: 'punctuation', foreground: 'ABB2BF' },
                            { token: 'operator', foreground: '56B6C2' },
                          ],
                          colors: {
                            'editor.background': '#1a1a1a',
                            'editor.foreground': '#e0e0e0',
                            'editor.lineHighlightBackground': '#2c2c2c',
                            'editor.selectionBackground': '#3e4451',
                            'editor.inactiveSelectionBackground': '#3a3f4b',
                            'editorCursor.foreground': '#528bff',
                            'editorLineNumber.foreground': '#636d83',
                            'editorLineNumber.activeForeground': '#abb2bf',
                            'editorWhitespace.foreground': '#3b4048',
                            'editorIndentGuide.background': '#3b4048',
                            'editorIndentGuide.activeBackground': '#545862',
                          }
                        });
                        
                        monaco.editor.defineTheme('custom-light', {
                          base: 'vs',
                          inherit: true,
                          rules: [
                            { token: 'comment', fontStyle: 'italic', foreground: 'A0A1A7' },
                            { token: 'keyword', foreground: 'A626A4' },
                            { token: 'string', foreground: '50A14F' },
                            { token: 'number', foreground: '986801' },
                            { token: 'type', foreground: 'C18401' },
                            { token: 'function', foreground: '4078F2' },
                            { token: 'variable', foreground: 'E45649' },
                            { token: 'constant', foreground: '986801' },
                            { token: 'parameter', foreground: '383A42' },
                            { token: 'property', foreground: 'E45649' },
                            { token: 'punctuation', foreground: '383A42' },
                            { token: 'operator', foreground: '0184BC' },
                          ],
                          colors: {
                            'editor.background': '#fafafa',
                            'editor.foreground': '#383A42',
                            'editor.lineHighlightBackground': '#f0f0f0',
                            'editor.selectionBackground': '#e5e5e6',
                            'editor.inactiveSelectionBackground': '#e5e5e6',
                            'editorCursor.foreground': '#526fff',
                            'editorLineNumber.foreground': '#9d9d9f',
                            'editorLineNumber.activeForeground': '#383A42',
                            'editorWhitespace.foreground': '#c5c5c5',
                            'editorIndentGuide.background': '#c5c5c5',
                            'editorIndentGuide.activeBackground': '#b3b3b3',
                          }
                        });
                        
                        // Set custom theme
                        monaco.editor.setTheme(theme === 'dark' ? 'custom-dark' : 'custom-light');
                        
                        // Focus editor
                        editor.focus();
                      }}
                    />
                  ) : (
                    <div className="h-full overflow-auto custom-scrollbar">
                      <SyntaxHighlighter
                        language={getLanguageMode()}
                        style={theme === 'dark' ? customDarkTheme : customLightTheme}
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          background: theme === 'dark' ? '#1a1a1a' : '#fafafa',
                          fontSize: '0.875rem',
                          lineHeight: '1.5rem',
                          minHeight: '100%',
                          fontFamily: 'Menlo, Monaco, "Courier New", monospace'
                        }}
                        showLineNumbers={false}
                        wrapLines={true}
                        wrapLongLines={true}
                        codeTagProps={{
                          style: {
                            fontFamily: 'inherit',
                          }
                        }}
                      >
                        {content || ' '}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className={`px-6 py-3 border-t flex items-center justify-between ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-4 text-xs">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    {getLanguageMode().toUpperCase()}
                  </span>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    {content.split('\n').length} lines
                  </span>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    {content.length} characters
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {hasChanges && (
                    <span className="text-xs text-yellow-500">
                      ● Unsaved changes
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FileEditorModal;