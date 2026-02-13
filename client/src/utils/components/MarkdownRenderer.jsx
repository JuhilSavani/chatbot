import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-body max-w-none w-full break-words text-[#fafafa] font-sans">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1({ children }) {
            return <h1 className="text-3xl font-extrabold mt-8 mb-4 text-[#fafafa] tracking-tight">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-2xl font-bold mt-6 mb-3 text-[#fafafa] tracking-tight">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xl font-bold mt-5 mb-2 text-[#fafafa]">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-lg font-bold mt-4 mb-2 text-[#fafafa]">{children}</h4>;
          },
          h5({ children }) {
            return <h5 className="text-base font-bold mt-3 mb-1 text-[#fafafa]">{children}</h5>;
          },
          h6({ children }) {
            return <h6 className="text-sm font-semibold mt-3 mb-1 text-[#a1a1aa]">{children}</h6>;
          },
          // Paragraphs
          p({ children }) {
             return <p className="mb-6 leading-7 last:mb-0 text-[#d4d4d8]">{children}</p>;
          },
          // Lists
          ul({ children }) {
            return <ul className="list-disc list-outside pl-6 mb-4 space-y-2 text-[#d4d4d8]">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside pl-10 mb-4 space-y-2 text-[#d4d4d8]">{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>;
          },
          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-white/20 pl-4 my-6 italic text-[#a1a1aa]">
                {children}
              </blockquote>
            );
          },
          // Horizontal Rule
          hr() {
            return <hr className="my-8 border-white/10" />;
          },
          // Images
          img({ src, alt }) {
            return <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-4 border border-white/10" />;
          },
          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-400 transition-all duration-100"
              >
                {children}
              </a>
            );
          },
          // Code
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
              <code className={`${className} bg-white/10 text-[#fafafa] px-1.5 py-0.5 rounded text-sm font-mono border border-white/5`} {...props}>
                {children}
              </code>
            );
          },
          // Pre (for non-language code blocks)
          // pre({ children }) {
          //   return (
          //     <pre className="my-4 p-4 rounded-xl overflow-x-auto bg-[#18181b] border border-white/10 text-sm font-mono text-[#fafafa] shadow-inner">
          //       {children}
          //     </pre>
          //   );
          // },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-6 border rounded-xl border-white/10 shadow-sm">
                <table className="w-full text-sm text-left">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-white/5 border-b border-white/10 text-[#fafafa]">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-4 py-3 font-semibold text-[#fafafa]">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-3 border-t border-white/5 text-[#d4d4d8]">{children}</td>;
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
    <div className="relative group my-6 rounded-xl overflow-hidden border border-white/10 bg-[#09090b] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5 text-xs text-[#a1a1aa]">
        <span className="font-mono font-medium text-[#fafafa]">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.25rem',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          background: '#09090b', // Match parent
        }}
        wrapLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
