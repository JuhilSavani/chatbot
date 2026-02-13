import React, { useState } from 'react';
import { ChevronDown, Terminal, CheckCircle2, Loader2, XCircle, ExternalLink, Code } from 'lucide-react';

// --- HELPER: Tool Renderers ---
// 1. Web Search Renderer
const WebSearchOutput = ({ output }) => {
  const items = output?.items || (Array.isArray(output) ? output : null);

  if (!items || !items.length) {
    return <DefaultOutput key="empty" output={output} />;
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {items.map((item, idx) => (
        <div key={idx} className="bg-black/20 p-2.5 rounded border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 underline decoration-transparent hover:decoration-blue-300 font-medium text-xs mb-1 transition-all duration-200"
          >
            <ExternalLink size={10} />
            <span className="truncate">{item.title || item.url}</span>
          </a>
          <p className="text-zinc-400 text-[10px] leading-relaxed line-clamp-2">
            {item.content || item.snippet || "No description available."}
          </p>
        </div>
      ))}
    </div>
  );
};


// 2. Default Fallback Renderer
const DefaultOutput = ({ output }) => {
  return (
    <pre className="text-green-400/90 whitespace-pre-wrap text-[10px] font-mono leading-tight">
      {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
    </pre>
  );
};

// --- CONFIGURATION MAP ---
const TOOL_RENDERERS = {
  'web_search': WebSearchOutput,
};

// --- HELPER: Tool Input Summary ---
// Extracts a short summary string from the input object for the header
const getToolInputSummary = (tool, input) => {
  if (!input) return null;
  
  if (tool === 'web_search' && input.query) {
    return input.query;
  }
  
  // Default: Try to verify if it's a simple string or single key object
  if (typeof input === 'string') return input;
  
  if (typeof input === 'object' && !Array.isArray(input)) {
    // Format as "key: value, key2: value2"
    return Object.entries(input)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`)
      .join(', ');
  }
  
  return JSON.stringify(input); // Fallback
}

// --- MAIN COMPONENT ---
export default function ToolCall({ 
  tool, 
  input, 
  output, 
  status = 'loading' 
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Determine Input Display for Header
  const inputSummary = getToolInputSummary(tool, input);

  // Determine Output Renderer
  const OutputComponent = TOOL_RENDERERS[tool] || DefaultOutput;

  return (
    <div className="w-full max-w-[85%] my-2 font-sans">
      {/* Header Bar */}
      <div
        className={`
          flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all select-none
          ${status === 'loading'
            ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
            : status === 'error'
            ? 'bg-red-50/50 border-red-200 text-red-700'
            : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-900 shadow-sm'
          }
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Terminal size={15} className={status === 'loading' ? 'animate-pulse text-blue-500' : 'text-zinc-500'} />
          <div className="flex items-center gap-2 flex-wrap">
            <span>Using tool: <span className="font-mono bg-black/5 px-1.5 py-0.5 rounded text-xs border border-black/5">{tool}</span></span>
            {inputSummary && (
              <span className="text-xs text-zinc-500 font-normal truncate max-w-[200px] hidden sm:inline-block">
                — "{inputSummary}"
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pl-2">
          {status === 'loading' && <Loader2 size={16} className="animate-spin text-zinc-400" />}
          {status === 'success' && <CheckCircle2 size={16} className="text-green-600" />}
          {status === 'error' && <XCircle size={16} className="text-red-600" />}
          
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
             <ChevronDown size={16} className="text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-[800px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}
        `}
      >
        <div className="bg-zinc-900 rounded-md p-3 text-xs text-zinc-300 overflow-x-auto border border-zinc-800 shadow-inner">
          {/* Input Section (Standardized Dump) */}
          {input && (
            <div className="mb-3">
              <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold mb-1 block">Input</span>
              <pre className="whitespace-pre-wrap font-mono text-zinc-400">
                {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output Section */}
          {(output || status === 'error') && (
            <div className={`pt-3 border-t border-zinc-800`}>
              <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold mb-1 block">
                {status === 'error' ? 'Error' : 'Results'}
              </span>
              <div className="mt-1">
                {status === 'error' ? (
                  <span className="text-red-400 font-mono text-xs break-all">
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
  );
}