import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatInput  from '@/utils/components/ChatInput'
import ChatSidebar from '@/utils/components/ChatSidebar'
import { useAuth } from '@/utils/hooks/useAuth'
import { loadChatHistoryAction, loadChatThreadsAction } from '@/utils/actions/chat.actions'
import { chatWithModelAction } from '@/utils/actions/chat.actions';
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
      <ChatSidebar threads={threads} isLoading={threadsLoading} />
      <MainContent setThreads={setThreads} />
    </SidebarProvider>
  )
}

function MainContent({ setThreads }) {
  const { open, toggleSidebar } = useSidebar()
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingResponse, setLoadingResponse] = useState(false)
  const [error, setError] = useState(null)
  const [currentThreadId, setCurrentThreadId] = useState(null)

  // Generate thread_id for new chat or use existing one from URL
  useEffect(() => {
    if (threadId) {
      // If we've just created a new thread by first message, don't reload
      if (threadId === currentThreadId) return;

      // Existing chat - load history
      setCurrentThreadId(threadId)
      loadChatHistory(threadId)
    } else {
      // New chat - generate thread_id
      if (auth.isAuthenticated && auth.user) {
        const newThreadId = `${auth.user.id}_${Date.now()}`
        setCurrentThreadId(newThreadId)
        setMessages([])
      }
    }
  }, [threadId, auth.isAuthenticated, auth.user])

  const loadChatHistory = async (tid) => {
    setLoading(true)
    try {
      const result = await loadChatHistoryAction(tid)
      if (result.error) {
        setError(result.error)
        setMessages([])
      } else {
        setMessages(result.messages || [])
        setError(null)
      }
    } catch(error){
      setError('Failed to load chat history!')
      console.error('Error loading chat history:', error)
    }finally {
      setLoading(false)
    }
  }

  const handleMessageSent = async (newMessage) => {
    // Add user message to UI
    setMessages(prev => [...prev, newMessage])
    
    // If this is a new chat (no threadId in URL), navigate to the thread URL
    if (!threadId && currentThreadId) {
      navigate(`/chat/${currentThreadId}`, { replace: true })
      setThreads((prev) => [{ 
        threadId: currentThreadId, 
        threadName: 'Untitled Chat',
        updatedAt: new Date().toISOString()
      }, ...prev])
    }

    // Set loading state for AI response
    setLoadingResponse(true)
    
    try {
      // Send message to backend and get AI response
      const result = await chatWithModelAction({
        threadId: currentThreadId,
        message: newMessage.content
      })

      if (result.error){
        // ADDED: Append error as a message instead of global state
        setMessages(prev => [...prev, {
          role: 'error',
          content: result.error || 'Failed to get response'
        }])
        console.error('Error getting AI response:', result.error)
      } else {
        // Add AI response to messages
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.response || 'No response received'
        }])

        setThreads(prevThreads => prevThreads.map(thread => 
          thread.threadId === currentThreadId
            ? { 
                threadId: currentThreadId,
                threadName: result.threadName || thread.threadName, 
                updatedAt: new Date().toISOString() 
              } 
            : thread
        ))
        setError(null)
      }
    } catch (err) {
      // ADDED: Append error as a message instead of global state
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Failed to get response'
      }])
      console.error('Error getting AI response:', err)
    } finally {
      setLoadingResponse(false)
    }
  }

  // Auto-scroll to bottom when messages change
  const messagesEndRef = React.useRef(null)
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
      {loading && (
        <div className="relative h-[2px] w-full overflow-hidden shrink-0">
           <div className="meteor-effect" /> 
        </div>
      )}

      {/* BODY - SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto p-8 w-full">
        {loading && (
          <div className="flex h-full items-center justify-center invisible">
            <div className="text-zinc-500">Loading chat history...</div>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center">
            <div className="text-red-500">{error}</div>
          </div>
        )}

        {!loading && !error && isNewChat && (
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

        {!loading && !error && !isNewChat && messages.length > 0 && (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`mb-4 p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-zinc-800 ml-auto max-w-[80%] w-fit' 
                    : 'bg-zinc-100 w-full p-8'
                }`}
              >
                <div className={`${
                  message.role === 'user' ? 'text-white' :  'text-zinc-800 w-full'
                }`}>
                  {message.role === 'user' 
                    ? message.content 
                    : message.role === 'error'
                      ? <span className="text-red-500">{message.content}</span>
                      : <MarkdownRenderer content={message.content} />
                  }
                </div>
              </div>
            ))}
            
            {/* Loading indicator for AI response */}
            {loadingResponse && (
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
            threadId={currentThreadId}
            onMessageSent={handleMessageSent}
            loading={loadingResponse}
            onStop={() => {}} 
          />
        </div>
      </div>

    </SidebarInset>
  )
}