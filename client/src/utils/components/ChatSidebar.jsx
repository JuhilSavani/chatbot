import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useAuth } from "../hooks/useAuth"
import { loadChatThreadsAction } from "../actions/chat.actions"

import { MessageSquare, Plus } from "lucide-react"
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

export default function ChatSidebar({ threads = [] }) {
  const { toggleSidebar, open, setOpen, isMobile } = useSidebar()
  const { auth } = useAuth()
  const navigate = useNavigate()
  const { threadId } = useParams()

  const handleNewChat = () => {
    // Navigate to base chat route - thread will be created on first message
    navigate('/chat')
  }

  const handleThreadClick = (thread) => {
    navigate(`/chat/${thread.threadId}`)
  }

  return (
    <>
    <Sidebar 
      variant="sidebar" 
      side="left" 
      collapsible="offcanvas" 
      className="border-none bg-zinc-950 text-white [&>[data-slot=sidebar-gap]]:hidden [&>[data-slot=sidebar-container]]:!z-50 [&>[data-slot=sidebar-container]]:shadow-2xl"
    >
      <SidebarHeader className="pt-6 px-4 pb-0 bg-zinc-950">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 px-2">
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
        
        <div className="p-4 pt-0 border-b border-white/10">
          <Button 
            onClick={handleNewChat}
            disabled={!auth.isAuthenticated}
            className="w-full justify-start gap-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white border border-zinc-700 mt-2 shadow-none p-6" 
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 bg-zinc-950">
        <SidebarMenu>
          {threads.map((thread) => (
            <SidebarMenuItem key={thread.threadId}>
              <SidebarMenuButton
                onClick={() => handleThreadClick(thread)}
                isActive={thread.threadId === threadId}
                className="group/thread relative w-full hover:bg-zinc-800 active:bg-zinc-800 data-[active=true]:bg-zinc-800 text-zinc-400 hover:text-white active:text-white data-[active=true]:text-white h-auto py-3 items-start transition-colors"
              >
                <MessageSquare className="h-4 w-4 mt-1 shrink-0" />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="truncate font-medium text-sm text-zinc-300 group-data-[active=true]/thread:text-white group-hover/thread:text-white group-active/thread:text-white transition-colors">
                    {thread.threadName || "Untitled Chat"}
                  </span>
                  <span className="text-xs text-zinc-500 truncate group-data-[active=true]/thread:text-zinc-400 group-hover/thread:text-zinc-400 group-active/thread:text-zinc-400 transition-colors">
                    {(!thread.updatedAt || isNaN(new Date(thread.updatedAt).getTime())) 
                      ? "" 
                      : new Date(thread.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {threads.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No chat threads yet. Start a new chat!
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 bg-zinc-950">
        {auth.isAuthenticated && auth.user && (
          <div className="px-2 py-2 text-sm text-zinc-400 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                {auth.user.username?.[0]?.toUpperCase()}
              </div>
              <span className="truncate">{auth.user.username}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>

    </>
  )
}