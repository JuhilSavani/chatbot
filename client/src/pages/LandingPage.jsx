import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/utils/hooks/useAuth";
import Loading from "./Loading";

export default function LandingPage() {
  const { auth, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && auth?.isAuthenticated) {
      navigate('/chat');
    }
  }, [auth, loading, navigate]);

  // Prevent flash of content while checking auth
  if (loading || auth?.isAuthenticated) {
    return <Loading />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#fafafa] font-sans">
      <style>{`
        .glass-nav {
            background: rgba(9, 9, 11, 0.7);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(39, 39, 42, 0.5);
        }
        .hero-glow {
            background: radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Navigation */}
      <nav className="glass-nav fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-linear-to-br from-white to-gray-300 shadow-[0_0_20px_rgba(255,255,255,0.8)]"></div>
            <span className="font-semibold text-2xl tracking-tight">Sidekick</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a1a1aa]">
            <a href="#features" className="hover:text-[#fafafa] transition-colors">Features</a>
            <a href="#technology" className="hover:text-[#fafafa] transition-colors">Technology</a>
            <a href="https://github.com/Start-Impulse/chatbot" target="_blank" rel="noopener noreferrer" className="hover:text-[#fafafa] transition-colors">GitHub</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium hover:text-white/80 transition-colors hidden sm:block">Log in</Link>
            <Link to="/register" className="bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 px-4 py-2 rounded-md text-sm font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow pt-32 pb-16 px-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] hero-glow pointer-events-none -z-10"></div>
        
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#a1a1aa] mb-4 hover:border-white/20 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>v1.0.0 Now Available</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-2">
            Unlock the Power of <br />
            <span className="text-white">Intelligent Conversations</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#a1a1aa] max-w-2xl mx-auto leading-relaxed">
            Experience seamless interaction with our advanced AI. Built with LangGraph and React 19 for persistent, context-aware dialogues that adapt to your needs.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/chat" className="w-full sm:w-auto px-8 py-3.5 bg-[#fafafa] text-[#18181b] font-medium rounded-lg hover:bg-[#fafafa]/90 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group">
              Start Chatting
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <a href="https://github.com/Start-Impulse/chatbot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#fafafa] font-medium rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              View Source
            </a>
          </div>
        </div>

        {/* Preview Image / Abstract Visual */}
        <div className="mt-20 max-w-5xl mx-auto rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm p-2 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10"></div>
           {/* Placeholder for a screenshot - using a CSS mock representation for now */}
          <div className="bg-[#18181b] rounded-lg aspect-[16/9] w-full flex overflow-hidden border border-white/5">
            {/* Sidebar Mock */}
            <div className="w-64 border-r border-white/5 bg-[#09090b] hidden md:flex flex-col p-4 gap-4">
              <div className="h-8 w-3/4 bg-white/5 rounded"></div>
              <div className="space-y-2 mt-4">
                 <div className="h-4 w-full bg-white/5 rounded opacity-60"></div>
                 <div className="h-4 w-5/6 bg-white/5 rounded opacity-40"></div>
                 <div className="h-4 w-4/6 bg-white/5 rounded opacity-30"></div>
              </div>
            </div>
            {/* Chat Area Mock */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-8 space-y-6">
                {/* Bot Message */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-white/10 rounded"></div>
                    <div className="h-16 w-3/4 bg-white/5 rounded"></div>
                  </div>
                </div>
                 {/* User Message */}
                 <div className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded bg-[#fafafa]/20 flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-12 w-1/2 bg-[#fafafa]/10 rounded ml-auto"></div>
                  </div>
                </div>
              </div>
              {/* Input Area */}
              <div className="p-4 border-t border-white/5">
                <div className="h-12 w-full bg-white/5 rounded-lg border border-white/10 mx-auto max-w-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Engineered for Excellence</h2>
            <p className="text-[#a1a1aa] max-w-2xl mx-auto">
              A robust architecture designed to provide the best conversational AI experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Streaming</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                Experience instant responses with token-by-token streaming, making conversations feel natural and fluid.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Persistent Memory</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                Powered by LangGraph, your conversations are saved and context is maintained across sessions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                Enterprise-grade security with Supabase Auth, JWT protection, and HTTP-only cookies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-sm text-[#a1a1aa]">
        <p>&copy; 2026 Sidekick. Built with React 19, Tailwind v4, and LangGraph.</p>
      </footer>
    </div>
  );
}
