import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar"
import { ArrowRight, StopCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatInput from '@/utils/components/ChatInput'
import ChatSidebar from '@/utils/components/ChatSidebar'
import { useAuth } from '@/utils/hooks/useAuth'
import { loadChatHistoryAction, loadChatThreadsAction, streamChatAction } from '@/utils/actions/chat.actions'
import MarkdownRenderer from '@/utils/components/MarkdownRenderer';
import ToolCall from '@/utils/components/ToolCall';

const SidebarInactiveIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className={className}>
    <rect height="12" width="14" x="3" y="4" rx="3" ry="3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    <line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ChatWindow() {
  const { auth } = useAuth()
  const [threads, setThreads] = useState([])
  const [threadsLoading, setThreadsLoading] = useState(false)

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    let mounted = true;
    (async () => {
      setThreadsLoading(true)
      try {
        const result = await loadChatThreadsAction()
        if (mounted && !result.error) {
          setThreads(result.threads || [])
        }
      } catch (error) {
        console.error('Error loading threads:', error)
      } finally {
        if (mounted) setThreadsLoading(false)
      }
    })();
    return () => { mounted = false; }
  }, [auth.isAuthenticated])

  return (
    <SidebarProvider style={{"--sidebar-width": "18rem"}} className="bg-zinc-950 overflow-hidden">
      <ChatSidebar threads={threads} isLoading={threadsLoading} setThreads={setThreads} />
      <MainContent setThreads={setThreads} />
    </SidebarProvider>
  )
}

const ChatMessage = React.memo(({ message }) => {
  // 1. Handle "Thinking" State
  if (message.isThinking) {
    return (
      <div className="mb-4 p-4 rounded-lg bg-zinc-100 w-full">
        <div className="flex items-center gap-2 text-zinc-700 text-sm">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
          <span>Thinking...</span>
        </div>
      </div>
    );
  }

  // 2. Handle Tool Calls
  if (message.role === 'tool_call') {
    return <ToolCall {...message.content} />;
  }

  // 3. Handle Standard Messages
  if (!message.content) return null;
  
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <div className={`mb-4 p-4 rounded-lg ${isUser ? 'bg-zinc-800 ml-auto max-w-[80%] w-fit' : 'bg-zinc-100 w-full p-8'}`}>
      <div className={isUser ? 'text-white' : 'text-zinc-800 w-full'}>
        {isUser ? message.content : isError ? <span className="text-red-500">{message.content}</span> : <MarkdownRenderer content={message.content} />}
      </div>
    </div>
  );
});

function MainContent({ setThreads }) {
  const { open, toggleSidebar } = useSidebar()
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()

  const [messages, setMessages] = useState([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [loadingResponse, setLoadingResponse] = useState(false)
  const [error, setError] = useState(null)

  const currentChatThreadId = useRef(null);
  const abortRef = useRef(null)
  const messagesEndRef = useRef(null)

  // LOAD HISTORY EFFECT
  useEffect(() => {
    // Case A: New Chat Page (No ID) -> Clear screen
    if (!threadId) {
      setMessages([])
      return
    }
    
    // Case B: We just created this thread locally -> SKIP FETCH
    if (currentChatThreadId.current === threadId) {
      currentChatThreadId.current = null // Reset for next time
      return
    }

    const controller = new AbortController();
    setLoadingChat(true);
    
    // Load chat history
    loadChatHistoryAction(threadId, controller.signal)
      .then(result => {
        if (result.error) {
          setError(result.error)
          setMessages([])
        } else {
          setMessages(result.messages || [])
          setError(null)
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError('Failed to load history')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingChat(false)
      });

    return () => controller.abort();
  }, [threadId])

  // SEND MESSAGE HANDLER
  const handleMessageSent = async (newMessage) => {
    // Optimistic UI Update
    setMessages(prev => [
      ...prev,
      { role: 'user', content: newMessage },
      // { role: 'assistant', content: '' } // Placeholder for stream
    ]);

    const activeThreadId = threadId || `${auth.user.id}_${Date.now()}`;
    const isNewThread = !threadId;

    if (isNewThread) {
      currentChatThreadId.current = activeThreadId;
      navigate(`/chat/${activeThreadId}`, { replace: true });
      setThreads(prev => [{
        threadId: activeThreadId,
        threadName: 'Untitled Chat',
        updatedAt: new Date().toISOString()
      }, ...prev]);
    }

    setLoadingResponse(true)
    
    try {
      const { stream, abort } = streamChatAction({
        threadId: activeThreadId,
        message: newMessage
      })
      
      // Store abort function for stop button
      abortRef.current = abort;

      for await (const event of stream) {
        if (event.type === 'token') {
          // Update the assistant's placeholder message
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.role !== 'assistant') {
              return [...prev, { role: 'assistant', content: event.val }];
            }
            return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + event.val }];
          });

        } else if (event.type === 'tool_start') {
          setMessages(prev => [...prev, {
            role: 'tool_call',
            content: { toolName: event.tool, input: event.input, status: 'loading' }
          }]);

        } else if (event.type === 'tool_end') {
          const cleanOutput = cleanToolOutput(event.output);

          // This code block is responsible for finding the specific "loading" tool bubble in chat history 
          // and updating it with the final results (the blue links).
          setMessages(prev => {
            // 1. Find the index
            const index = prev.findLastIndex(msg => 
              msg.role === 'tool_call' && 
              msg.content.toolName === event.tool && 
              msg.content.status === 'loading'
            );

            // 2. Safety Check: If not found, return original state (No re-render)
            if (index === -1) return prev;

            // 3. Update: Clone array and replace only the specific item
            const newMsgs = [...prev];
            newMsgs[index] = {
              ...newMsgs[index],
              content: { 
                ...newMsgs[index].content, 
                output: cleanOutput, 
                status: 'success' 
              }
            };
          
            return newMsgs;
          });

        } else if (event.type === 'error') {
          setMessages(prev => [...prev, { role: 'error', content: event.val }]);
          
        } else if (event.type === 'threadName') {
           setThreads(prev => prev.map(t => t.threadId === activeThreadId ? { ...t, threadName: event.val } : t));
        }
      }
    } catch (err) {
      console.error("Stream failed", err);
      // Optional: Add visual error state to message
    } finally {
      setLoadingResponse(false);
      abortRef.current = null;
    }
  };

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
      setLoadingResponse(false);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loadingResponse])

  const contentStateClasses = open 
    ? "bg-white my-2 mr-2 rounded-md border border-zinc-200 shadow-xl overflow-hidden" 
    : "bg-white m-0 rounded-none border-none";

  const isNewChat = messages.length === 0 && !loadingChat;

  return (
    <SidebarInset className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col overflow-hidden ${contentStateClasses} ${open ? 'h-[calc(100vh-1rem)]' : 'h-screen'}`}>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-300 px-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10 w-full">
        <div className={`transition-all duration-300 ${open ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'}`}>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="-ml-2 h-8 w-8 text-zinc-500 hover:text-zinc-900">
            <SidebarInactiveIcon />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {!open && <span className="h-4 w-px bg-zinc-400 mr-2" />}
          <span className="text-sm font-medium text-zinc-900">{isNewChat ? "New Conversation" : "Chat"}</span>
        </div>
      </header>

      {loadingChat && <div className="relative h-[2px] w-full overflow-hidden shrink-0"><div className="meteor-effect" /></div>}

      <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full scroll-smooth">
        {error && <div className="text-red-500 text-center mt-10">{error}</div>}

        {isNewChat && !error && (
           <div className="flex h-full flex-col items-center justify-center animate-in fade-in duration-500">
             <div className="w-12 h-12 bg-zinc-50 rounded-md flex items-center justify-center mb-4 border border-zinc-200 shadow-sm">
               <div className="w-3 h-3 bg-zinc-900 rounded-full animate-pulse" />
             </div>
             <h2 className="text-2xl font-medium text-zinc-900">How can I help you?</h2>
           </div>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full pb-4">
            
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {loadingResponse && messages[messages.length - 1]?.role !== 'assistant' && (
              <ChatMessage message={{ isThinking: true }} />
            )}
            <div ref={messagesEndRef} className="h-px w-full" />
          </div>
        )}
      </div>

      <div className="shrink-0 w-full p-4 bg-white border-t border-zinc-200">
        <div className="max-w-2xl mx-auto">
          <ChatInput 
            threadId={currentChatThreadId} 
            onMessageSent={handleMessageSent} 
            loading={loadingResponse}
            onStop={handleStop}
          />
        </div>
      </div>
    </SidebarInset>
  )
}

const cleanToolOutput = (output) => {
  if (!output) return null;

  let cleanOutput = output;

  // 1. If it's a string, try to parse it (removing markdown)
  if (typeof cleanOutput === 'string') {
    try {
      const raw = cleanOutput
        .replace(/^```json\s*/, '')  // Remove start ```json
        .replace(/^```\s*/, '')      // Remove start ```
        .replace(/\s*```$/, '')      // Remove end ```
        .trim();
      cleanOutput = JSON.parse(raw);
    } catch (e) {
      // If parsing fails, keep strictly as string (might be plain text)
    }
  }

  // 2. Unwrap LangChain "lc: 1" structure
  if (
    cleanOutput &&
    typeof cleanOutput === 'object' &&
    cleanOutput.lc === 1 &&
    cleanOutput.kwargs &&
    cleanOutput.kwargs.content
  ) {
    cleanOutput = cleanOutput.kwargs.content;

    // 3. Parse inner content if it's a string (Recursive clean)
    if (typeof cleanOutput === 'string') {
      try {
        const rawInner = cleanOutput
          .replace(/^```json\s*/, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        cleanOutput = JSON.parse(rawInner);
      } catch (e) {
        // Keep as string if inner parse fails
      }
    }
  }

  return cleanOutput;
};