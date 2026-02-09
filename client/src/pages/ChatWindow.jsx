import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatInput  from '@/utils/components/ChatInput'
import ChatSidebar from '@/utils/components/ChatSidebar'
import { useAuth } from '@/utils/hooks/useAuth'
import { loadChatHistoryAction, loadChatThreadsAction, streamChatAction } from '@/utils/actions/chat.actions'
import MarkdownRenderer from '@/utils/components/MarkdownRenderer';

const SidebarInactiveIcon = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 20 20" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <rect 
      height="12" width="14" x="3" y="4" 
      rx="3" ry="3" 
      fill="none" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
    />
    <line 
      x1="8" y1="4" x2="8" y2="16" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

const SuggestionItem = ({ text }) => (
  <button className="bg-zinc-900 w-full p-3.5 px-5 rounded-lg flex items-center justify-between group">
    <span className="text-[#a1a1aa] group-hover:text-[#f4f4f5] text-[0.95rem] text-left">{text}</span>
    <ArrowRight 
      size={18} 
      className="text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" 
    />
  </button>
);

export default function ChatWindow() {
  const { auth } = useAuth()
  const [threads, setThreads] = useState([])
  const [threadsLoading, setThreadsLoading] = useState(false)

  useEffect(() => {
    if (auth.isAuthenticated) {
      (async function () {
        setThreadsLoading(true)
        try {
          const result = await loadChatThreadsAction()
          if (result.error) {
            console.error('Error loading chat threads:', result.error)
          } else {
            setThreads(result.threads || [])
          }
        } catch (error) {
          console.error('Error loading chat threads:', error)
        } finally {
          setThreadsLoading(false)
        }
      })()
    }
  }, [auth.isAuthenticated])

  return (
    <SidebarProvider 
      style={{"--sidebar-width": "18rem"}} 
      className="bg-zinc-950 overflow-hidden" 
    >
      <ChatSidebar threads={threads} isLoading={threadsLoading} setThreads={setThreads} />
      <MainContent setThreads={setThreads} />
    </SidebarProvider>
  )
}

const ChatMessage = ({ message }) => {
  if (!message.content) return null;
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  // Base styles for the bubble container
  const containerClasses = `mb-4 p-4 rounded-lg ${
    isUser 
      ? 'bg-zinc-800 ml-auto max-w-[80%] w-fit' 
      : 'bg-zinc-100 w-full p-8'
  }`;

  // Base styles for the text content
  const textClasses = isUser ? 'text-white' : 'text-zinc-800 w-full';

  return (
    <div className={containerClasses}>
      <div className={textClasses}>
        {isUser ? (
          message.content
        ) : isError ? (
          <span className="text-red-500">{message.content}</span>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  );
};

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

    // Load chat history
    (async () => {
      setLoadingChat(true)
      try {
        const result = await loadChatHistoryAction(threadId, controller.signal);
        if (result.error) {
          setError(result.error)
          setMessages([])
        } else {
          setMessages(result.messages || [])
          setError(null)
        }
      } catch (error) {
        // Ignore errors caused by aborting
        if (error.name !== 'AbortError') {
          setError('Failed to load chat history!')
          console.error('Error loading chat history:', error)
        }
      } finally {
        // Only turn off loading if THIS request finished naturally.
        // If it was aborted, it means a NEW request has likely already started 
        // and turned loading back on. We don't want to turn it off.
        if (!controller.signal.aborted) {
          setLoadingChat(false)
        }
      }
    })();

    return () => controller.abort();
  }, [threadId])


  // SEND MESSAGE HANDLER
  const handleMessageSent = async (newMessage) => {
    // Optimistic UI Update
    setMessages(prev => [
      ...prev, 
      { role: 'user', content: newMessage },
      { role: 'assistant', content: '' } // Placeholder for stream
    ]);
    
    const activeThreadId = threadId || `${auth.user.id}_${Date.now()}`;
    const isNewThread = !threadId;

    if (isNewThread) {
      currentChatThreadId.current = activeThreadId;
      navigate(`/chat/${activeThreadId}`, { replace: true });
      setThreads((prev) => [{ 
        threadId: activeThreadId, 
        threadName: 'Untitled Chat',
        updatedAt: new Date().toISOString()
      }, ...prev])
    }

    // Start streaming
    setLoadingResponse(true)    
    try {
      const { stream, abort } = streamChatAction({
        threadId: activeThreadId,
        message: newMessage
      })
    
      // Store abort function for stop button
      abortRef.current = abort
      
      for await (const event of stream) {
        if (event.type === 'token') {
          // Update the assistant's placeholder message
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            // Safety: ensure we are modifying the assistant's message
            if (lastMsg.role !== 'assistant') return prev;
            return [
              ...prev.slice(0, -1), 
              { ...lastMsg, content: lastMsg.content + event.val }
            ];
          });
        } else if (event.type === 'error') {
          setMessages(prev => {
            return [
              ...prev,
              { role: 'error', content: event.val || "Stream failed." }
            ];
          });
          console.error("Stream Error Event:", event.val);
        } else if (event.type === 'threadName') {
          // Update Sidebar Name
          setThreads(prev => prev.map(t => 
            t.threadId === activeThreadId ? { ...t, threadName: event.val } : t
          ));
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

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
      setLoadingResponse(false);
    }
  };

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loadingResponse])


  const contentStateClasses = open 
    ? "bg-white my-2 mr-2 rounded-md border border-zinc-200 shadow-xl overflow-hidden" 
    : "bg-white m-0 rounded-none border-none";

  const isNewChat = messages.length === 0

  return (
    <SidebarInset className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col overflow-hidden ${contentStateClasses} ${open ? 'h-[calc(100vh-1rem)]' : 'h-screen'}`}>
      
      {/* HEADER */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-300 px-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10 w-full">
        
        <div className={`transition-all duration-300 ${open ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'}`}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="-ml-2 h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-black/5"
          >
            <SidebarInactiveIcon />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {!open && <span className="h-4 w-px bg-zinc-400 mr-2" />} 
          <span className="text-sm font-medium text-zinc-900">
            {isNewChat ? "New Conversation" : "Chat"}
          </span>
        </div>
      </header>
      
      {/* Loading Bar */}
      {loadingChat && (
        <div className="relative h-[2px] w-full overflow-hidden shrink-0">
           <div className="meteor-effect" /> 
        </div>
      )}

      {/* BODY - SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto p-8 w-full">
        {loadingChat && (
          <div className="flex h-full items-center justify-center invisible">
            <div className="text-zinc-500">Loading chat history...</div>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center">
            <div className="text-red-500">{error}</div>
          </div>
        )}

        {!loadingChat && !error && isNewChat && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="w-12 h-12 bg-zinc-50 rounded-md flex items-center justify-center mb-4 border border-zinc-200 shadow-md">
              <div className="w-3 h-3 bg-zinc-900 rounded-full animate-pulse" />
            </div>

            <h2 className="text-[2rem] text-zinc-900 font-medium">How can I help you?</h2>

            {/* <div className="w-full max-w-160 flex flex-col gap-2 mt-8">
              <SuggestionItem text="How does a neural network learn from data?" />
              <SuggestionItem text="Explain quantum computing in simple terms" />
              <SuggestionItem text="Why are there so many 'r's in strawberry?" />
            </div> */}
          </div>
        )}

        {!loadingChat && !error && !isNewChat && messages.length > 0 && (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            
            {/* Loading indicator for AI response */}
            {loadingResponse && messages.length > 0 && !messages[messages.length - 1].content && (
              <div className="mb-4 p-4 rounded-lg w-full flex items-center gap-2">
                 <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
                <span className="text-zinc-900 text-sm font-medium ml-1">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
                
      {/* INPUT - STICKY BOTTOM */}
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