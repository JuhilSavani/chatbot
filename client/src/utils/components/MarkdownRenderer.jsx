import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

export default function MarkdownRenderer({ content }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none w-full break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        modules={['md-code-block']}
        components={{
          p({ children }) {
             return <p className="mb-6 leading-7 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-outside pl-6 mb-4 space-y-2">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside pl-10 mb-4 space-y-2">{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>;
          },
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return (
                <CodeBlock 
                  language={match[1]} 
                  value={codeString} 
                  {...props} 
                />
              );
            }
            return (
              <code className={`${className} bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm font-mono`} {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-6 border rounded-md border-zinc-300 dark:border-zinc-700">
                <table className="w-full text-sm text-left">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">{children}</td>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-zinc-700/50 bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-zinc-700 text-xs text-zinc-400">
        <span className="font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          background: 'transparent'
        }}
        wrapLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
