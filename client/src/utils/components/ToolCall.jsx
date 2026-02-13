import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Terminal, CheckCircle2, Loader2, XCircle, ExternalLink } from 'lucide-react';

export default function ToolCall({ toolName, input, output, status = 'loading' }) {
  const [isOpen, setIsOpen] = useState(false);

  // 1. Safe Parse & Normalize Input
  // We explicitly handle the { input: "{\"query\": ...}" } nesting here
  const parsedInput = useMemo(() => {
    const raw = safeParse(input);
    
    // Check if we have the nested structure: { input: STRING_JSON }
    if (raw && typeof raw === 'object' && raw.input && typeof raw.input === 'string') {
      try {
        const inner = JSON.parse(raw.input);
        // If inner is an object (like { query: "..." }), use that instead
        if (inner && typeof inner === 'object') {
          return inner;
        }
        // If inner is just a string, return an object wrapping it
        return { input: inner }; 
      } catch (e) {
        // If inner string isn't JSON, just return the raw object
        return raw;
      }
    }
    return raw;
  }, [input]);

  const parsedOutput = useMemo(() => safeParse(output), [output]);

  // Helper to determine what to display in the header & input box
  const inputDisplay = useMemo(() => {
    if (!parsedInput) return null;
    // Prefer showing the 'query' if it exists
    if (parsedInput.query) return parsedInput.query;
    // If parsedInput is just a string, show that
    if (typeof parsedInput === 'string') return parsedInput;
    // Fallback: null (will show full JSON)
    return null;
  }, [parsedInput]);

  // Renderer for results
  const renderOutput = () => {
    if (status === 'error') {
      return (
        <span className="text-red-400 font-mono text-xs break-all">
          {typeof output === 'string' ? output : JSON.stringify(output)}
        </span>
      );
    }

    if (!parsedOutput) return null;

    let results = null;
    if (Array.isArray(parsedOutput)) {
      results = parsedOutput;
    } else if (parsedOutput.results && Array.isArray(parsedOutput.results)) {
      results = parsedOutput.results;
    }

    // Beautiful Blue Links Renderer
    if (results && results.length > 0 && (results[0].url || results[0].title)) {
      return (
        <div className="flex flex-col gap-2 mt-2">
          {results.map((result, idx) => (
            <div key={idx} className="bg-black/20 p-2.5 rounded border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:underline font-medium text-xs truncate mb-1"
              >
                <ExternalLink size={10} />
                <span className="truncate">{result.title || result.url}</span>
              </a>
              <p className="text-zinc-400 text-[10px] leading-relaxed line-clamp-2">
                {result.content}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // Default JSON fallback
    return (
      <pre className="text-green-400/90 whitespace-pre-wrap text-[10px] font-mono leading-tight">
        {JSON.stringify(parsedOutput, null, 2)}
      </pre>
    );
  };

  return (
    <div className="w-full max-w-[85%] my-2 font-sans">
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
            <span>Using tool: <span className="font-mono bg-black/5 px-1.5 py-0.5 rounded text-xs border border-black/5">{toolName}</span></span>
            {/* Header Query Display: Now clean! */}
            {inputDisplay && (
              <span className="text-xs text-zinc-500 font-normal truncate max-w-[200px] hidden sm:inline-block">
                — "{inputDisplay}"
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

      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-[800px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}
        `}
      >
        <div className="bg-zinc-900 rounded-md p-3 text-xs text-zinc-300 overflow-x-auto border border-zinc-800 shadow-inner">
          {/* Input Section */}
          <div className="mb-3">
            <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold mb-1 block">Input</span>
            {/* If we have a clean string/query, show it simply. Otherwise dump JSON */}
            {inputDisplay ? (
              <div className="font-mono text-zinc-200 bg-black/30 p-2 rounded border border-white/5">
                "{inputDisplay}"
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(parsedInput, null, 2)}</pre>
            )}
          </div>

          {/* Output Section */}
          {(output || status === 'error') && (
            <div className="pt-3 border-t border-zinc-800">
              <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold mb-1 block">
                {status === 'error' ? 'Error' : 'Results'}
              </span>
              <div className="mt-1">
                {renderOutput()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Utility: Robust JSON Parser with LC Unwrapping ---
const safeParse = (data) => {
  if (!data) return null;
  let parsed = data;

  // 1. Basic Parse
  if (typeof parsed === 'string') {
    try {
      const cleaned = parsed.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return data;
    }
  }

  // 2. Unwrap LangChain Object (fix for output)
  if (parsed && typeof parsed === 'object' && parsed.lc === 1 && parsed.kwargs && parsed.kwargs.content) {
    return safeParse(parsed.kwargs.content);
  }

  // 3. Recursive Double-String Check
  if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
     try {
        return safeParse(JSON.parse(parsed));
     } catch {
        return parsed;
     }
  }

  return parsed;
};