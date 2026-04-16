import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { ArrowRight, StopCircle, Copy, Check, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatInput from "@/utils/components/ChatInput";
import ChatSidebar from "@/utils/components/ChatSidebar";
import { useAuth } from "@/utils/hooks/useAuth";
import {
  loadChatHistoryAction,
  loadChatThreadsAction,
  streamChatAction,
  ingestDocumentsAction,
} from "@/utils/actions/chat.actions";
import { getUsage, saveUsage } from "@/utils/indexedDB";
import MarkdownRenderer from "@/utils/components/MarkdownRenderer";
import ToolCall from "@/utils/components/ToolCall";
import { parseToolInput, parseToolOutput } from "@/utils/toolParsing";

const SidebarInactiveIcon = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"
    className={className}
  >
    <rect
      height="12"
      width="14"
      x="3"
      y="4"
      rx="3"
      ry="3"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <line
      x1="8"
      y1="4"
      x2="8"
      y2="16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ChatWindow() {
  const { auth } = useAuth();
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    let mounted = true;
    (async () => {
      setThreadsLoading(true);
      try {
        const result = await loadChatThreadsAction();
        if (mounted && !result.error) {
          setThreads(result.threads || []);
        }
      } catch (error) {
        console.error("Error loading threads:", error);
      } finally {
        if (mounted) setThreadsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth.isAuthenticated]);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "18rem" }}
      className="bg-[#09090b] text-[#fafafa] overflow-hidden"
    >
      <ChatSidebar
        threads={threads}
        isLoading={threadsLoading}
        setThreads={setThreads}
      />
      <MainContent setThreads={setThreads} />
    </SidebarProvider>
  );
}

const ChatMessage = React.memo(({ message, messageRef }) => {
  const [copied, setCopied] = useState(false);

  // 1. Handle "Thinking" State
  if (message.isThinking) {
    return (
      <div className="flex items-center gap-3 text-[#d4d4d8] text-sm">
        <div className="w-4 h-4 border-2 border-[#d4d4d8] border-t-transparent rounded-full animate-spin" />
        <span>Thinking...</span>
      </div>
    );
  }

  // 2. Handle "PDF Processing" State
  if (message.isPdfProcessing) {
    return (
      <div className="flex items-center gap-3 text-[#d4d4d8] text-sm">
        <div className="w-4 h-4 border-2 border-[#d4d4d8] border-t-transparent rounded-full animate-spin" />
        <span>Processing PDFs...</span>
      </div>
    );
  }

  // 3. Handle Tool Calls
  if (message.role === "tool_call") {
    const { tool, input, output, status } = message.content;
    const parsedInput = parseToolInput(tool, input);
    const parsedOutput = parseToolOutput(tool, output);

    return (
      <ToolCall
        tool={tool}
        input={parsedInput}
        output={parsedOutput}
        status={status}
      />
    );
  }

  // 4. Handle Standard Messages
  if (!message.content) return null;

  const isUser = message.role === "user";
  const isError = message.role === "error";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={messageRef}
      className={`mb-6 flex flex-col relative group ${isUser ? "items-end" : "items-start w-full"}`}
    >
      {/* PDF Attachments */}
      {isUser && message.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 justify-end max-w-[95%] md:max-w-[80%]">
          {message.attachments.map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border bg-white/10 border-white/10 text-white"
            >
              <svg
                className="w-4 h-4 text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              <span className="truncate max-w-[80px]">{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`p-4 rounded-2xl ${isUser ? "bg-white/10 max-w-[95%] md:max-w-[80%] w-fit border border-white/5 text-[#fafafa]" : "bg-transparent w-full px-2"}`}
      >
        <div className={isUser ? "text-[#fafafa]" : "text-[#fafafa] w-full"}>
          {isUser ? (
            message.content
          ) : isError ? (
            <span className="text-red-400">{message.content}</span>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {!isUser && !isError && (
          <div className="mt-2 flex items-center justify-start">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 p-1.5 rounded-md text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/5 transition-colors text-xs"
              title="Copy response"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copy</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

function MainContent({ setThreads }) {
  const { open, toggleSidebar, isMobile } = useSidebar();
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [hasStreamStarted, setHasStreamStarted] = useState(false);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState(null);
  const [generationScrollRequest, setGenerationScrollRequest] = useState(0);

  const isUsageLocked = !!usage && usage.remaining <= 0;
  const usageResetLabel = usage?.reset
    ? new Date(usage.reset).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  useEffect(() => {
    if (auth?.user?.id) {
      getUsage(auth.user.id).then((data) => {
        if (data) setUsage(data);
      });
    }
  }, [auth?.user?.id]);

  const currentChatThreadId = useRef(null);
  const abortRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const latestAssistantMessageRef = useRef(null);
  const latestHumanMessageRef = useRef(null);
  const handledGenerationScrollRequestRef = useRef(0);
  const stopRequestedRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Track whether the bottom sentinel is visible within the scroll container.
  useEffect(() => {
    const root = scrollContainerRef.current;
    const sentinel = messagesEndRef.current;
    if (!root || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { root, threshold: 1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToGenerationBoundary = useCallback(() => {
    const assistantTarget = latestAssistantMessageRef.current;
    if (assistantTarget) {
      assistantTarget.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      return;
    }

    latestHumanMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  }, []);

  useLayoutEffect(() => {
    if (!generationScrollRequest || loadingResponse) return;
    if (handledGenerationScrollRequestRef.current === generationScrollRequest) {
      return;
    }

    handledGenerationScrollRequestRef.current = generationScrollRequest;
    scrollToGenerationBoundary();
  }, [generationScrollRequest, loadingResponse, scrollToGenerationBoundary]);

  const showScrollButtonPulse = loadingResponse && hasStreamStarted;

  // LOAD HISTORY EFFECT
  useEffect(() => {
    // Case A: New Chat Page (No ID) -> Clear screen
    if (!threadId) {
      setMessages([]);
      return;
    }

    // Case B: We just created this thread locally -> SKIP FETCH
    if (currentChatThreadId.current === threadId) {
      currentChatThreadId.current = null; // Reset for next time
      return;
    }

    const controller = new AbortController();
    setLoadingChat(true);

    // Load chat history
    loadChatHistoryAction(threadId, controller.signal)
      .then((result) => {
        if (result.error) {
          setError(result.error);
          setMessages([]);
        } else {
          setMessages(result.messages || []);
          setError(null);
        }
      })
      .catch((err) => {
        // Ignore both native AbortError and Axios CanceledError
        if (
          err.name === "AbortError" ||
          err.name === "CanceledError" ||
          axios.isCancel(err)
        )
          return;

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load history",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingChat(false);
      });

    return () => controller.abort();
  }, [threadId]);

  // SEND MESSAGE HANDLER
  const handleMessageSent = async (messageData) => {
    const { message: newMessage, attachments, selectedModel } = messageData;
    stopRequestedRef.current = false;

    // Optimistic UI Update
    const userMsg = { role: "user", content: newMessage };
    if (attachments?.length > 0) {
      userMsg.attachments = attachments.map((a) => a.name);
    }

    setMessages((prev) => [...prev, userMsg]);

    const activeThreadId = threadId || `${auth.user.id}_${Date.now()}`;
    const isNewThread = !threadId;

    if (isNewThread) {
      currentChatThreadId.current = activeThreadId;
      navigate(`/chat/${activeThreadId}`, { replace: true });
      setThreads((prev) => [
        {
          threadId: activeThreadId,
          threadName: "Untitled Chat",
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    let shouldScrollToGenerationBoundary = false;
    let encounteredStreamError = false;

    setHasStreamStarted(false);
    setLoadingResponse(true);

    try {
      if (attachments?.length > 0) {
        setMessages((prev) => [...prev, { isPdfProcessing: true }]);
        const ingestResult = await ingestDocumentsAction(
          activeThreadId,
          attachments,
        );
        setMessages((prev) => prev.filter((m) => !m.isPdfProcessing));

        if (ingestResult.error) {
          setError(ingestResult.error);
          setLoadingResponse(false);
          return;
        }
      }

      const { stream, abort } = streamChatAction({
        threadId: activeThreadId,
        message: newMessage,
        selectedModel,
      });

      // Store abort function for stop button
      abortRef.current = abort;

      for await (const event of stream) {
        if (event.type === "token") {
          setHasStreamStarted(true);
          // Update the assistant's placeholder message
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.role !== "assistant") {
              return [...prev, { role: "assistant", content: event.val }];
            }
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + event.val },
            ];
          });
        } else if (event.type === "tool_start") {
          setHasStreamStarted(true);
          setMessages((prev) => [
            ...prev,
            {
              runId: event.runId,
              role: "tool_call",
              content: {
                tool: event.tool,
                input: event.input,
                status: "loading",
              },
            },
          ]);
        } else if (event.type === "run_init") {
          if (event.payload?.usage) {
            setUsage(event.payload.usage);
            if (auth?.user?.id) saveUsage(auth.user.id, event.payload.usage);
          }
        } else if (event.type === "tool_end") {
          // This code block is responsible for finding the specific "loading" tool bubble in chat history
          // and updating it with the final results (the blue links).
          setMessages((prev) => {
            // 1. Find the index
            const index = prev.findIndex(
              (msg) => msg.role === "tool_call" && msg.runId === event.runId,
            );

            // 2. Safety Check: If not found, return original state (No re-render)
            if (index === -1) return prev;

            // 3. Update: Clone array and replace only the specific item
            const newMsgs = [...prev];
            newMsgs[index] = {
              ...newMsgs[index], // { runId, role, content: { tool, input, status: 'loading' } }
              content: {
                ...newMsgs[index].content,
                output: event.output,
                status: event.status || event.output?.status || "success",
              },
            };

            return newMsgs;
          });
        } else if (event.type === "error") {
          encounteredStreamError = true;
          if (event.isLimit) {
            const newUsage = {
              remaining: 0,
              reset: event.reset || Date.now() + 2592000000,
            };
            setUsage(newUsage);
            if (auth?.user?.id) saveUsage(auth.user.id, newUsage);
          }
          setMessages((prev) => [
            ...prev,
            { role: "error", content: event.val },
          ]);
        } else if (event.type === "threadName") {
          setThreads((prev) =>
            prev.map((t) =>
              t.threadId === activeThreadId
                ? { ...t, threadName: event.val }
                : t,
            ),
          );
        }
      }

      shouldScrollToGenerationBoundary = !encounteredStreamError;
    } catch (err) {
      console.error("Stream failed", err);
      // Optional: Add visual error state to message
    } finally {
      setLoadingResponse(false);
      setHasStreamStarted(false);
      abortRef.current = null;

      if (shouldScrollToGenerationBoundary && !stopRequestedRef.current) {
        setGenerationScrollRequest((prev) => prev + 1);
      }
    }
  };

  const handleStop = useCallback(() => {
    stopRequestedRef.current = true;
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
      setLoadingResponse(false);
      setHasStreamStarted(false);
    }
  }, []);

  const contentStateClasses =
    !isMobile && open
      ? "bg-[#09090b] my-2 mr-2 rounded-2xl border-white/5 shadow-2xl"
      : "bg-[#09090b] m-0 rounded-none border-transparent";

  const isNewChat = messages.length === 0 && !loadingChat;
  const latestAssistantIndex = messages.reduce(
    (latestIndex, currentMessage, currentIndex) =>
      currentMessage.role === "assistant" ? currentIndex : latestIndex,
    -1,
  );
  const latestHumanIndex = messages.reduce(
    (latestIndex, currentMessage, currentIndex) =>
      currentMessage.role === "user" ? currentIndex : latestIndex,
    -1,
  );

  return (
    <SidebarInset
      className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col overflow-hidden border ${contentStateClasses} ${!isMobile && open ? "h-[calc(100dvh-1rem)]" : "h-[100dvh]"}`}
    >
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-4 md:px-6 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10 w-full">
        <div
          className={`transition-all duration-300 ${!isMobile && open ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100"}`}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="-ml-2 h-8 w-8 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/5"
          >
            <SidebarInactiveIcon />
          </Button>
        </div>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {!isMobile && !open && (
              <span className="h-4 w-px bg-white/10 mr-2" />
            )}
            <span className="text-sm font-medium text-[#fafafa]">
              {isNewChat ? "New Conversation" : "Chat"}
            </span>
          </div>

          {(() => {
            const remaining = usage ? usage.remaining : 5;
            const isLoaded = !!usage;
            return (
              <div className="flex flex-col items-end">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 bg-[#18181b]/80 border border-white/10 rounded-full`}
                >
                  <div
                    className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${remaining > 0 ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"}`}
                  ></div>
                  <span className="text-[12px] font-medium text-[#fafafa] whitespace-nowrap">
                    {remaining} / 5 usages left
                  </span>
                </div>
                {isLoaded && remaining === 0 && usageResetLabel && (
                  <div className="text-[10px] text-[#71717a] mt-1 px-2 whitespace-nowrap absolute top-12 right-6">
                    Resets: {usageResetLabel}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </header>

      {loadingChat && (
        <div className="relative h-[2px] w-full overflow-hidden shrink-0">
          <div className="meteor-effect" />
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto p-4 md:p-8 w-full scroll-smooth"
      >
        {error && (
          <div className="text-red-400 text-center mt-10 p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
            {error}
          </div>
        )}

        {isNewChat && !error && (
          <div className="flex h-full flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <div className="w-2 h-2 bg-[#fafafa] rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>
            <h2 className="text-3xl font-bold text-[#fafafa] tracking-tight mb-2">
              How can I help you?
            </h2>
            <p className="text-[#a1a1aa] text-center max-w-sm">
              Start a new conversation or select an existing one from the
              sidebar.
            </p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full pb-8">
            {messages.map((message, index) => {
              const messageRef =
                index === latestAssistantIndex
                  ? latestAssistantMessageRef
                  : index === latestHumanIndex
                    ? latestHumanMessageRef
                    : null;

              return (
                <ChatMessage
                  key={index}
                  message={message}
                  messageRef={messageRef}
                />
              );
            })}

            {loadingResponse &&
              messages[messages.length - 1]?.role !== "assistant" &&
              !messages.some((m) => m.isPdfProcessing) && (
                <ChatMessage message={{ isThinking: true }} />
              )}
          </div>
        )}
        <div ref={messagesEndRef} className="h-px w-full shrink-0" />
        {/* Scroll-to-bottom floating button */}
        {!loadingChat && messages.length > 0 && !isAtBottom && (
          <div className="sticky -bottom-2 flex justify-center pointer-events-none">
            <div className="relative pointer-events-auto isolate">
              {showScrollButtonPulse && (
                <>
                  <span className="beep-sync pointer-events-none absolute -inset-2 rounded-full border border-zinc-400/20 bg-zinc-400/6 shadow-[0_0_0_1px_rgba(161,161,170,0.08),0_0_20px_rgba(161,161,170,0.08)]" />
                  <span className="beep-sync pointer-events-none absolute -inset-4 rounded-full border border-zinc-400/12 bg-zinc-400/4 opacity-55 blur-[1px]" />
                </>
              )}
              <button
                id="scroll-to-bottom-btn"
                onClick={scrollToBottom}
                className={[
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-[#fafafa] shadow-lg transition-colors duration-200 overflow-hidden",
                  "bg-[#18181b] hover:bg-[#27272a]",
                  showScrollButtonPulse
                    ? "border-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_32px_rgba(255,255,255,0.22)]"
                    : "border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
                ].join(" ")}
                title="Jump to latest message"
                aria-label="Jump to latest message"
              >
                {showScrollButtonPulse && (
                  <span className="beep-sync pointer-events-none absolute inset-0 z-0 rounded-full bg-zinc-300/8" />
                )}
                <ArrowDown className="relative z-10 w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 w-full p-2 md:p-4 bg-[#09090b] border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {isUsageLocked && (
            <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg">
              <h2 className="text-md font-medium text-amber-300 mb-1">
                Monthly Limit Reached
              </h2>
              <p className="text-[#a1a1aa] text-sm text-left">
                You've used your free queries for this month. Your limit will
                reset on{" "}
                <span className="text-[#fafafa] font-medium">
                  {usageResetLabel}
                </span>
                .
              </p>
            </div>
          )}
          <ChatInput
            threadId={currentChatThreadId}
            onMessageSent={handleMessageSent}
            loading={loadingResponse}
            onStop={handleStop}
            disabled={isUsageLocked}
          />
        </div>
      </div>
    </SidebarInset>
  );
}
