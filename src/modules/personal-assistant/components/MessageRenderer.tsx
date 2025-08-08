import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageRendererProps {
  content: string;
  type: 'user' | 'assistant';
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({ content, type }) => {
  const isUser = type === 'user';
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Paragraphs
        p: ({ children }) => {
          // Check if children contains block-level elements
          const hasBlockContent = React.Children.toArray(children).some(child => {
            if (React.isValidElement(child)) {
              const type = child.type;
              // Check for block elements that shouldn't be in <p>
              if (typeof type === 'string' && ['div', 'pre', 'table', 'blockquote', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(type)) {
                return true;
              }
              // Check for custom components that render block elements
              if (typeof type === 'function' && child.props?.className?.includes('my-3')) {
                return true;
              }
            }
            return false;
          });

          // If block content is found, render as div instead of p
          if (hasBlockContent) {
            return (
              <div className={isUser ? "text-white mb-2 text-sm" : "text-white mb-2 text-sm"}>
                {children}
              </div>
            );
          }

          return (
            <p className={isUser ? "text-white mb-2 text-sm" : "text-white mb-2 text-sm"}>
              {children}
            </p>
          );
        },
        
        // Headers
        h1: ({ children }) => (
          <h1 className={isUser ? "text-white text-xl font-bold mb-2 mt-3" : "text-white text-xl font-bold mb-2 mt-3 border-b border-gray-600 pb-2"}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className={isUser ? "text-white text-lg font-bold mb-2 mt-2" : "text-white text-lg font-bold mb-2 mt-2"}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className={isUser ? "text-white text-base font-semibold mb-2 mt-2" : "text-white text-base font-semibold mb-2 mt-2"}>
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className={isUser ? "text-white text-sm font-semibold mb-1" : "text-gray-100 text-sm font-semibold mb-1"}>
            {children}
          </h4>
        ),
        
        // Strong & Emphasis
        strong: ({ children }) => (
          <strong className={isUser ? "text-white font-bold" : "text-yellow-400 font-bold"}>
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className={isUser ? "text-white italic opacity-95" : "text-blue-300 italic"}>
            {children}
          </em>
        ),
        
        // Links
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className={isUser 
              ? "text-white underline opacity-90 hover:opacity-100 transition-opacity" 
              : "text-blue-400 underline hover:text-blue-300 transition-colors"
            }
          >
            {children}
          </a>
        ),
        
        // Lists
        ul: ({ children }) => (
          <ul className={isUser ? "text-white list-disc list-inside mb-2 ml-2 text-sm" : "text-gray-100 list-disc list-inside mb-2 ml-2 text-sm"}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className={isUser ? "text-white list-decimal list-inside mb-2 ml-2 text-sm" : "text-gray-100 list-decimal list-inside mb-2 ml-2 text-sm"}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className={isUser ? "text-white mb-1 text-sm" : "text-gray-100 mb-1 text-sm"}>
            {children}
          </li>
        ),
        
        // Code
        code: ({ inline, children, className }) => {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match ? match[1] : '';
          
          // For inline code or when explicitly marked as inline
          if (inline !== false) {
            return (
              <code className={isUser 
                ? "bg-white/20 text-white px-1.5 py-0.5 rounded text-sm font-mono" 
                : "bg-blue-950 text-blue-200 px-1.5 py-0.5 rounded text-sm font-mono border border-blue-800"
              }>
                {children}
              </code>
            );
          }
          
          // For code blocks, don't render here - let pre handle it
          return null;
        },
        pre: ({ children, ...props }) => {
          // Extract language from the code element
          let lang = '';
          let codeContent = children;
          
          if (React.isValidElement(children) && children.props?.className) {
            const match = /language-(\w+)/.exec(children.props.className);
            lang = match ? match[1] : '';
            codeContent = children.props.children;
          }
          
          return (
            <div className="relative my-3">
              {lang && (
                <div className="absolute top-0 right-0 px-2 py-1 text-xs text-gray-400 bg-gray-900 rounded-tl rounded-br">
                  {lang}
                </div>
              )}
              <pre className="bg-gray-950 border border-gray-700 rounded-lg p-3 overflow-x-auto max-w-full">
                <code className="text-gray-100 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {codeContent}
                </code>
              </pre>
            </div>
          );
        },
        
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className={isUser 
            ? "border-l-4 border-white/50 pl-4 my-3 text-white/90 italic" 
            : "border-l-4 border-blue-500 pl-4 my-3 bg-gray-800/50 py-2 pr-3 rounded-r text-gray-200 italic"
          }>
            {children}
          </blockquote>
        ),
        
        // Tables - GitHub Flavored Markdown
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 max-w-full">
            <table className="w-full border border-gray-600">
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
          <tbody className="bg-gray-900">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-white font-semibold border-r border-gray-700 last:border-r-0 text-sm">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-gray-100 border-r border-gray-700 last:border-r-0 text-sm">
            {children}
          </td>
        ),
        
        // Horizontal Rule
        hr: () => (
          <hr className="my-4 border-gray-600" />
        ),
        
        // Images
        img: ({ src, alt }) => (
          <img 
            src={src} 
            alt={alt} 
            className="rounded-lg my-3 max-w-full h-auto"
          />
        ),
        
        // Task Lists (GFM)
        input: ({ type, checked, disabled }) => {
          if (type === 'checkbox') {
            return (
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                className="mr-2"
                readOnly
              />
            );
          }
          return null;
        },
        
        // Definition Lists
        dl: ({ children }) => (
          <dl className="my-3">
            {children}
          </dl>
        ),
        dt: ({ children }) => (
          <dt className={isUser ? "text-white font-semibold" : "text-yellow-400 font-semibold"}>
            {children}
          </dt>
        ),
        dd: ({ children }) => (
          <dd className={isUser ? "text-white ml-4 mb-2" : "text-gray-200 ml-4 mb-2"}>
            {children}
          </dd>
        ),
        
        // Keyboard
        kbd: ({ children }) => (
          <kbd className="bg-gray-800 text-gray-100 px-2 py-1 rounded text-xs font-mono border border-gray-600 shadow-sm">
            {children}
          </kbd>
        ),
        
        // Abbreviation
        abbr: ({ title, children }) => (
          <abbr title={title} className="underline decoration-dotted cursor-help">
            {children}
          </abbr>
        ),
        
        // Mark/Highlight
        mark: ({ children }) => (
          <mark className="bg-yellow-400/30 text-yellow-200 px-1 rounded">
            {children}
          </mark>
        ),
        
        // Strikethrough
        del: ({ children }) => (
          <del className="line-through opacity-75">
            {children}
          </del>
        ),
        
        // Subscript & Superscript
        sub: ({ children }) => (
          <sub className="text-xs">
            {children}
          </sub>
        ),
        sup: ({ children }) => (
          <sup className="text-xs">
            {children}
          </sup>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// JSON Renderer Component
export const JsonRenderer: React.FC<{ data: any }> = ({ data }) => {
  return (
    <pre className="bg-gray-950 border border-gray-700 rounded-lg p-3 overflow-x-auto my-2 max-w-full">
      <code className="text-gray-100 text-xs font-mono whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </code>
    </pre>
  );
};

// Helper function to detect content type
export const detectContentType = (content: string): 'json' | 'markdown' => {
  // Try to parse as JSON
  try {
    JSON.parse(content);
    return 'json';
  } catch {
    return 'markdown';
  }
};

// Main Message Component
export const MessageContent: React.FC<{ content: string; type: 'user' | 'assistant' }> = ({ content, type }) => {
  const contentType = detectContentType(content);
  
  if (contentType === 'json') {
    try {
      const jsonData = JSON.parse(content);
      return <JsonRenderer data={jsonData} />;
    } catch {
      // Fallback to markdown if JSON parsing fails
    }
  }
  
  return <MessageRenderer content={content} type={type} />;
};