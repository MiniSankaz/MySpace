'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MessageRendererProps {
  content: string;
  type: 'user' | 'assistant' | 'system';
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({ content, type }) => {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyMessage = async () => {
    await handleCopy(content, 'message');
  };

  return (
    <div className="message-content-wrapper">
      {/* Copy entire message button */}
      {type === 'assistant' && (
        <button
          onClick={handleCopyMessage}
          className="message-copy-button"
          title="Copy entire message"
        >
          {copiedStates['message'] ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers with styling
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-blue-400 border-b border-gray-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-blue-300">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-blue-200">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-3 mb-2 text-gray-300">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="leading-relaxed text-gray-100" style={{ marginBottom: '0.1rem' }}>
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-1 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-100">
              {children}
            </li>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 italic text-gray-300 bg-gray-800/50 rounded-r">
              {children}
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-700">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-800/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-100">
              {children}
            </td>
          ),
          
          // Inline code
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return (
                <div className="code-block-wrapper">
                  <div className="code-block-header">
                    <span className="code-language">{match[1]}</span>
                    <button
                      onClick={() => handleCopy(codeString, codeId)}
                      className="code-copy-button"
                      title="Copy code"
                    >
                      {copiedStates[codeId] ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0 0 0.5rem 0.5rem',
                      fontSize: '0.875rem',
                      maxWidth: '100%',
                      overflowX: 'auto',
                      wordBreak: 'break-all',
                    }}
                    codeTagProps={{
                      style: {
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap',
                      }
                    }}
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            if (!inline) {
              return (
                <div className="code-block-wrapper">
                  <div className="code-block-header">
                    <span className="code-language">text</span>
                    <button
                      onClick={() => handleCopy(codeString, codeId)}
                      className="code-copy-button"
                      title="Copy code"
                    >
                      {copiedStates[codeId] ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <pre className="code-block-plain">
                    <code>{children}</code>
                  </pre>
                </div>
              );
            }
            
            return (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          },
          
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-gray-700" />
          ),
          
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-white">
              {children}
            </strong>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-gray-200">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};