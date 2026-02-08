import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useAuth } from "../hooks/useAuth"
import { loadChatThreadsAction } from "../actions/chat.actions"

import { MessageSquare, Plus, Search, LogOut, Pin, Trash2 } from "lucide-react"
import useLogout from "../hooks/useLogout"
import { usePinnedThreads } from "../hooks/usePinnedThreads"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"


const SidebarActiveIcon = ({ className = "w-4 h-5" }) => (
  <svg 
    viewBox="0 0 20 20" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path 
      d="m6,4h2v12h-2c-1.656,0-3-1.344-3-3v-6c0-1.656,1.344-3,3-3Z" 
      fill="currentColor" 
      strokeWidth="0"
    />
    <rect 
      height="12" width="14" x="3" y="4" 
      rx="3" ry="3" 
      fill="none" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
    />
  </svg>
);

export default function ChatSidebar({ threads = [], isLoading = false }) {
  const { toggleSidebar, open, setOpen, isMobile } = useSidebar()
  const { auth } = useAuth()
  const { logout, logoutLoading } = useLogout()
  const navigate = useNavigate()
  const { threadId } = useParams()
  const [searchQuery, setSearchQuery] = useState("")

  // Initialize with threads that are already pinned from server
  const { pinned, togglePin } = usePinnedThreads(
    threads.filter(t => t.isPinned).map(t => t.threadId)
  );

  const handleNewChat = () => {
    // Navigate to base chat route - thread will be created on first message
    navigate('/chat')
    setSearchQuery("")
  }

  const handleThreadClick = (thread) => {
    navigate(`/chat/${thread.threadId}`)
  }

  // Filter first
  const filtered = threads.filter(thread => 
    (thread.threadName || "Untitled Chat").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split into pinned and unpinned
  const pinnedThreads = filtered.filter(t => pinned.has(t.threadId)).sort((a, b) => {
    // Sort pinned threads by updated date (or any other criteria)
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  
  const otherThreads = filtered.filter(t => !pinned.has(t.threadId)).sort((a, b) => {
    // Sort other threads by date
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const renderThreadItem = (thread) => (
    <SidebarMenuItem key={thread.threadId}>
      <SidebarMenuButton
        onClick={() => handleThreadClick(thread)}
        isActive={thread.threadId === threadId}
        className="px-4 group/thread relative w-full hover:bg-zinc-800 active:bg-zinc-800 data-[active=true]:bg-zinc-800 text-zinc-400 hover:text-white active:text-white data-[active=true]:text-white h-auto items-start transition-colors"
      >
        <MessageSquare className="h-4 w-4 mt-1 shrink-0" />
        <div className="flex flex-col gap-1 min-w-0 flex-1 relative">
          <div className="flex items-center justify-between">
            <span className="truncate font-medium text-sm text-zinc-300 group-data-[active=true]/thread:text-white group-hover/thread:text-white group-active/thread:text-white transition-colors pr-6">
              {thread.threadName || "Untitled Chat"}
            </span>
            {pinned.has(thread.threadId) && (
              <Pin className="h-3 w-3 text-zinc-400 rotate-45 shrink-0 block group-hover/thread:hidden" />
            )}
          </div>
          <span className="text-xs text-zinc-500 truncate group-data-[active=true]/thread:text-zinc-400 group-hover/thread:text-zinc-400 group-active/thread:text-zinc-400 transition-colors">
            {(!thread.updatedAt || isNaN(new Date(thread.updatedAt).getTime())) 
              ? "" 
              : new Date(thread.updatedAt).toLocaleDateString()}
          </span>
          
          {/* Hover Actions */}
          <div className="absolute right-0 top-0 h-full flex items-center gap-1 opacity-0 group-hover/thread:opacity-100 transition-opacity bg-gradient-to-l from-zinc-800 via-zinc-800 to-transparent pl-4">
              <div 
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                togglePin(thread.threadId);
              }}
              className="p-1 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-colors"
              title={pinned.has(thread.threadId) ? "Unpin thread" : "Pin thread"}
            >
              <Pin className={`h-4.5 w-4.5 ${pinned.has(thread.threadId) ? "fill-current text-white" : ""}`} />
            </div>
              <div 
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                // Delete logic here
              }}
              className="p-1 hover:bg-red-500/20 rounded-md text-zinc-400 hover:text-red-400 transition-colors"
              title="Delete thread"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <>
    <Sidebar 
      variant="sidebar" 
      side="left" 
      collapsible="offcanvas" 
      className="border-none bg-zinc-950 text-white [&>[data-slot=sidebar-gap]]:hidden [&>[data-slot=sidebar-container]]:!z-50 [&>[data-slot=sidebar-container]]:shadow-2xl"
    >
      <SidebarHeader className="pt-6 pb-0 bg-zinc-950">
        <div className="px-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 font-bold text-[1.1rem] tracking-tight">
              <div className="w-5.5 h-5.5 rounded-md bg-linear-to-br from-white to-gray-300 shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
              Sidekick
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <SidebarActiveIcon/>
          </Button>
        </div>
       
        <Button 
          onClick={handleNewChat}
          disabled={!auth.isAuthenticated}
          className="w-full justify-start gap-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white border border-zinc-700 shadow-none p-6" 
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>

        <div className="flex flex-col w-full">
          <div className="relative group">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-3 w-full text-zinc-300 pl-8 text-sm border-b border-zinc-800 focus:border-zinc-300 focus:outline-none transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="relative h-[4px] w-full overflow-hidden">
            {isLoading && <div className="meteor-effect" />}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 bg-zinc-950">
        <SidebarMenu>
          {/* Pinned Threads Section */}
          {pinnedThreads.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Pinned
              </div>
              {pinnedThreads.map(renderThreadItem)}
              
              {/* Separator if needed */}
              {otherThreads.length > 0 && <Separator className="my-2 bg-zinc-800" />}
            </>
          )}

          {/* Other Threads Section */}
          {otherThreads.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Recent
              </div>
              {otherThreads.map(renderThreadItem)}
            </>
          )}
        </SidebarMenu>

        {threads.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No chat threads yet. Start a new chat!
          </div>
        )}
        
        {threads.length > 0 && pinnedThreads.length === 0 && otherThreads.length === 0 && (
           <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No results found.
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 bg-zinc-950">
          <div className="flex items-center justify-between m-2 border-t border-zinc-800 p-4 pb-0">
            <div>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 inline-flex mr-4">
                {auth.user.username?.[0]?.toUpperCase()}
              </div>
              <span className="truncate">{auth.user.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              disabled={logoutLoading}
              className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
         
      </SidebarFooter>
    </Sidebar>

    </>
  )
}