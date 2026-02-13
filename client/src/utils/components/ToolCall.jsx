import React, { useState } from 'react';
import { ChevronDown,Wrench, CheckCircle2, Loader2, XCircle, ExternalLink, Code } from 'lucide-react';

// --- HELPER: Tool Renderers ---
const WebSearchOutput = ({ output }) => {
  const items = output?.items || (Array.isArray(output) ? output : null);

  if (!items || !items.length) {
    return <DefaultOutput key="empty" output={output} />;
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {items.map((item, idx) => (
        <a
          key={idx}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-[#18181b] p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all duration-200"
        >
          <div className="flex items-center gap-2 text-blue-400 group-hover:text-blue-300 underline decoration-blue-400/30 group-hover:decoration-blue-400 font-medium text-xs mb-1 transition-all duration-100">
            <span className="truncate">{item.title || item.url}</span>
          </div>
          <p className="text-[#a1a1aa] text-[11px] leading-relaxed line-clamp-2 group-hover:text-[#d4d4d8] transition-colors">
            {item.content || item.snippet || "No description available."}
          </p>
        </a>
      ))}
    </div>
  );
};

// 2. Default Fallback Renderer
const DefaultOutput = ({ output }) => {
  return (
    <pre className="text-green-400/90 whitespace-pre-wrap text-[11px] font-mono leading-relaxed bg-[#18181b] p-3 rounded-lg border border-white/5">
      {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
    </pre>
  );
};

const TOOL_RENDERERS = {
  'web_search': WebSearchOutput,
};

const getToolInputSummary = (tool, input) => {
  if (!input) return null;
  
  if (tool === 'web_search' && input.query) {
    return input.query;
  }
  
  if (typeof input === 'string') return input;
  
  if (typeof input === 'object' && !Array.isArray(input)) {
    return Object.entries(input)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`)
      .join(', ');
  }
  
  return JSON.stringify(input); 
}

export default function ToolCall({ 
  tool, 
  input, 
  output, 
  status = 'loading' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputSummary = getToolInputSummary(tool, input);
  const OutputComponent = TOOL_RENDERERS[tool] || DefaultOutput;

  return (
    <div className="w-full max-w-[85%] my-4 font-sans text-sm">
      {/* Header Bar */}
      <div
        className={`
          flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none
          ${status === 'loading'
            ? 'bg-white/5 border-white/5 text-[#a1a1aa]'
            : status === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-white/5 border-white/5 hover:bg-white/8 text-[#fafafa] shadow-sm hover:border-white/10'
          }
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 font-medium">
          <div className={`p-1.5 rounded-md border border-white/5 bg-blue-500/10 text-blue-400`}>
            <Wrench size={14} className={status === 'loading' ? 'animate-pulse' : ''} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#a1a1aa]">Using tool: <span className="font-mono text-[#fafafa] bg-white/5 px-1.5 py-0.5 rounded text-xs border border-white/5">{tool}</span></span>
            {inputSummary && (
              <span className="text-xs text-[#52525b] font-normal truncate max-w-[200px] hidden sm:inline-block border-l border-white/10 pl-2">
                "{inputSummary}"
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pl-2">
          {status === 'loading' && <Loader2 size={16} className="animate-spin text-blue-400" />}
          {status === 'success' && <CheckCircle2 size={16} className="text-green-400" />}
          {status === 'error' && <XCircle size={16} className="text-red-400" />}
          
          <div className={`p-1 hover:bg-white/5 rounded-md transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`}>
             <ChevronDown size={14} className="text-[#a1a1aa]" />
          </div>
        </div>
      </div>

      {/* Expandable Content with smooth grid animation */}
      <div 
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
      >
        <div className="overflow-hidden">
          <div className="bg-[#09090b] rounded-xl p-4 text-xs text-[#d4d4d8] border border-white/5 shadow-inner">
            {/* Input Section */}
            {input && (
              <div className="mb-4">
                <span className="text-[#52525b] uppercase tracking-wider text-[10px] font-bold mb-2 block flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#52525b] rounded-full"></div> 
                  Input
                </span>
                <pre className="whitespace-pre-wrap font-mono text-[#a1a1aa] bg-[#18181b] p-3 rounded-lg border border-white/5">
                  {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
                </pre>
              </div>
            )}

            {/* Output Section */}
            {(output || status === 'error') && (
              <div className={`pt-4 border-t border-white/5`}>
                <span className="text-[#52525b] uppercase tracking-wider text-[10px] font-bold mb-2 block flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#52525b] rounded-full"></div>
                  {status === 'error' ? 'Error Details' : 'Results'}
                </span>
                <div className="mt-1">
                  {status === 'error' ? (
                    <span className="text-red-400 font-mono text-xs break-all bg-red-500/5 p-3 rounded-lg border border-red-500/10 block">
                      {typeof output === 'string' ? output : JSON.stringify(output)}
                    </span>
                  ) : (
                    <OutputComponent output={output} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}