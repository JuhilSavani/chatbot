import React, { useState } from "react";
import {
  ChevronDown,
  Wrench,
  CheckCircle2,
  Loader2,
  XCircle,
  Link as LinkIcon,
} from "lucide-react";

// --- HELPER: Tool Renderers ---

const getFavicon = (url) => {
  try {
    const { origin } = new URL(url);
    return `${origin}/favicon.ico`;
  } catch {
    return null;
  }
};

const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const WebSearchOutput = ({ output }) => {
  const items = output?.items || (Array.isArray(output) ? output : null);

  if (!items || !items.length) {
    return <DefaultOutput output={output} />;
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      {items.map((item, idx) => {
        const domain = getDomain(item.url);
        const favicon = getFavicon(item.url);

        return (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-sm px-3 py-2.5 transition-all duration-200 no-underline"
          >
            {/* Favicon */}
            <div className="flex-shrink-0 w-6 h-6 rounded-sm overflow-hidden bg-white/5 flex items-center justify-center border border-white/5">
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <span
                className="text-[10px] font-bold text-[#71717a] uppercase leading-none"
                style={{ display: favicon ? "none" : "flex" }}
              >
                {domain.charAt(0)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[#d4d4d8] group-hover:text-white text-xs font-medium truncate leading-tight transition-colors duration-150">
                {item.title || domain}
              </p>
              <p className="text-[#52525b] group-hover:text-[#71717a] text-[10px] truncate mt-0.5 transition-colors duration-150 font-mono">
                {domain}
              </p>
            </div>

            {/* Index badge */}
            <span className="flex-shrink-0 text-[9px] font-bold text-[#d4d4d8] tabular-nums transition-colors">
              {String(idx + 1).padStart(2, "0")}
            </span>
          </a>
        );
      })}
    </div>
  );
};

// Default Fallback Renderer
const DefaultOutput = ({ output }) => {
  return (
    <pre className="w-full text-green-400/90 whitespace-pre-wrap text-[11px] font-mono leading-relaxed bg-[#18181b] p-3 rounded-md border border-white/5">
      {output}
    </pre>
  );
};

const toolRenderers = {
  web_search: WebSearchOutput,
};

export default function ToolCall({ tool, input, output, status = "loading" }) {
  const [isOpen, setIsOpen] = useState(false);
  const OutputComponent = toolRenderers[tool] || DefaultOutput;
  const hideOutputPanel = tool === "scrape_url";
  const hasOutput = !hideOutputPanel && (output || status === "error");

  return (
    <div className="w-full mt-2 mb-0.5 font-sans text-sm self-stretch">
      {/* Header Bar */}
      <div
        className={`
          flex items-center justify-between px-3 py-2.5 rounded-md border transition-all select-none
          ${
            status === "loading"
              ? "bg-white/[0.03] border-white/5 text-[#a1a1aa]"
              : status === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-white/[0.03] border-white/5 hover:bg-white/[0.05] text-[#fafafa] hover:border-white/10"
          }
          ${hasOutput ? "cursor-pointer" : "cursor-default"}
        `}
        onClick={hasOutput ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Icon */}
          <div
            className={`flex-shrink-0 p-1.5 rounded-md border border-white/5 ${status === "error" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}
          >
            <Wrench
              size={13}
              className={status === "loading" ? "animate-pulse" : ""}
            />
          </div>

          {/* Label + query */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[#71717a] text-xs whitespace-nowrap flex-shrink-0">
              Using tool:{" "}
              <span className="font-mono text-[#d4d4d8] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-[11px]">
                {tool}
              </span>
            </span>
            {input && (
              <span className="text-[11px] text-[#52525b] truncate border-l border-white/8 pl-2 leading-tight">
                {input}
              </span>
            )}
          </div>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2 pl-2 flex-shrink-0">
          {status === "loading" && (
            <Loader2 size={14} className="animate-spin text-blue-400" />
          )}
          {status === "success" && (
            <CheckCircle2 size={14} className="text-emerald-400" />
          )}
          {status === "error" && <XCircle size={14} className="text-red-400" />}

          {hasOutput && (
            <div
              className={`p-1 rounded-md hover:bg-white/5 transition-all duration-200 ${isOpen ? "rotate-180" : ""}`}
            >
              <ChevronDown size={13} className="text-[#d4d4d8]" />
            </div>
          )}

          {tool === "scrape_url" && input && status === "success" && (
            <a
              href={input}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md hover:bg-white/5 transition-all duration-200"
              title="Open link in new tab"
            >
              <LinkIcon size={13} className="text-[#d4d4d8] hover:text-white" />
            </a>
          )}
        </div>
      </div>

      {/* Expandable Results */}
      {hasOutput && (
        <div
          className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100 mt-1.5" : "grid-rows-[0fr] opacity-0 mt-0"}`}
        >
          <div className="overflow-hidden">
            <div className="w-full bg-white/[0.03] rounded-md px-3 py-3 border border-white/5">
              {status === "error" ? (
                <span className="text-red-400 font-mono text-xs break-all bg-red-500/5 p-3 rounded-md border border-red-500/10 block">
                  {typeof output === "string" ? output : JSON.stringify(output)}
                </span>
              ) : (
                <OutputComponent output={output} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
