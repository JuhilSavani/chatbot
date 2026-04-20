import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/utils/hooks/useAuth";
import Loading from "./Loading";

export default function LandingPage() {
  const { auth, loading } = useAuth();
  const navigate = useNavigate();
  const [activeNote, setActiveNote] = useState(null);

  useEffect(() => {
    if (!loading && auth?.isAuthenticated) {
      navigate('/chat');
    }
  }, [auth, loading, navigate]);

  if (loading || auth?.isAuthenticated) {
    return <Loading />
  }

  const toggleNote = (index) => {
    setActiveNote(prev => prev === index ? null : index);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#09090b] text-[#fafafa] font-sans antialiased">
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
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
            <span className="font-semibold text-2xl tracking-tight">Sidekick</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a1a1aa]">
            <a href="#tech-stack" className="hover:text-[#fafafa] transition-colors">Tech Stack</a>
            <a href="#features" className="hover:text-[#fafafa] transition-colors">Features</a>
            <a href="#faqs" className="hover:text-[#fafafa] transition-colors">FAQs</a>
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="hover:text-[#fafafa] transition-colors">GitHub</a>
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] hero-glow pointer-events-none -z-10"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in-up">
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#a1a1aa] mb-4 hover:border-white/20 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Open Source Engineering Project</span>
            <span className="w-px h-3 bg-white/10 mx-1"></span>
            <span className="text-white/60">v1.0.0</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-white to-white/60 pb-2">
            Your personal sidekick.<br />
            <span className="text-white">Beyond the prompt.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#a1a1aa] max-w-3xl mx-auto leading-relaxed">
            Sidekick is an open source personal AI assistant with long-term memory. It learns your preferences, 
            masters your documents, and recalls past context across every session. It grows smarter the more you use it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/chat" className="w-full sm:w-auto px-8 py-3.5 bg-[#fafafa] border border-transparent text-[#18181b] font-medium rounded-lg hover:bg-[#fafafa]/90 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group">
              Start Chatting for Free
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#fafafa] font-medium rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              Explore the Open Project
            </a>
          </div>
        </div>

        {/* Preview Image / Abstract Visual */}
        <div className="mt-20 max-w-5xl mx-auto rounded-xl border border-white/10 p-2 shadow-2xl relative">
          {/* Bottom fade-blur overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-[65%] bg-linear-to-t from-[#09090b] via-[#09090b]/10 to-transparent z-30 pointer-events-none rounded-b-xl"></div>
          
          <div className="bg-[#09090b] rounded-lg h-[620px] md:h-[650px] w-full flex overflow-hidden border border-white/5 relative z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
             {/* Sidebar Mock */}
             <div className="w-64 border-r border-[#27272a]/20 bg-[#09090b] hidden md:flex flex-col flex-shrink-0 text-[#fafafa]">
                 {/* Sidebar Header */}
                <div className="p-4 pb-0 pointer-events-none select-none">
                     <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-[#fafafa] mb-6 px-2">
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
                        <span className="font-semibold text-2xl tracking-tight">Sidekick</span>
                    </div>
                    <div className="w-full flex items-center justify-center gap-2 bg-[#18181b]/50 text-[#fafafa] border border-white/5 h-10 px-4 rounded-md transition-all text-sm font-medium mb-4">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#a1a1aa]"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                         <span className="opacity-80">New Chat</span>
                    </div>
                    <div className="relative group px-1 mb-2 text-left">
                        <div className="w-full bg-transparent pl-8 py-2 text-sm border-b border-white/5 transition-all outline-none text-[#52525b] opacity-80">Search chats...</div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] opacity-80"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                </div>
                {/* Sidebar Items */}
                <div className="flex-1 overflow-hidden px-2 py-2 flex flex-col pointer-events-none select-none">
                     <div className="px-4 py-2 text-xs font-semibold text-[#52525b] uppercase tracking-wider text-left">Recent</div>
                     <div className="w-full flex items-start gap-3 px-4 py-2 rounded-md bg-zinc-800 text-white">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                         <div className="flex flex-col gap-1 min-w-0 flex-1 text-left">
                             <span className="truncate font-medium text-sm text-white">Transformer Architecture</span>
                             <span className="text-xs text-zinc-400 truncate">Just now</span>
                         </div>
                     </div>
                     <div className="w-full flex items-start gap-3 px-4 py-2 rounded-md text-zinc-400">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                         <div className="flex flex-col gap-1 min-w-0 flex-1 text-left">
                             <span className="truncate font-medium text-sm text-zinc-300">System Architecture v3</span>
                             <span className="text-xs text-zinc-500 truncate">Yesterday</span>
                         </div>
                     </div>
                     <div className="w-full flex items-start gap-3 px-4 py-2 rounded-md text-zinc-400">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                         <div className="flex flex-col gap-1 min-w-0 flex-1 text-left">
                             <span className="truncate font-medium text-sm text-zinc-300">Database Migration Plan</span>
                             <span className="text-xs text-zinc-500 truncate">10/02/2026</span>
                         </div>
                     </div>
                </div>
                {/* Sidebar Footer */}
                <div className="p-2 border-t border-white/5 mt-auto pointer-events-none select-none">
                     <div className="flex items-center justify-between mx-2 mb-2 pt-2 px-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/5 text-[#fafafa] font-medium text-sm">JS</div>
                            <span className="truncate text-sm font-medium text-[#fafafa]">juhilsavani</span>
                        </div>
                     </div>
                </div>
             </div>

             {/* Chat Area Mock */}
             <div className="flex-1 flex flex-col bg-[#09090b] min-w-0 relative">
                 {/* Chat Header */}
                 <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-6 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10 w-full pointer-events-none select-none">
                     <div className="flex items-center gap-4">
                         <span className="h-4 w-px bg-white/10 mr-2 hidden md:block"></span>
                         <span className="text-sm font-medium text-[#fafafa]">Transformer Architecture</span>
                     </div>
                 </div>

                 {/* Messages */}
                 <div className="flex-1 overflow-hidden p-4 md:p-8 w-full flex flex-col pointer-events-none select-none">
                     <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full pb-8">
                         {/* User Message */}
                         <div className="mb-6 p-4 rounded-2xl relative bg-white/10 ml-auto max-w-[85%] md:max-w-[80%] w-fit border border-white/5 text-[#fafafa]">
                             <div className="text-[#fafafa] text-sm md:text-base">
                                Can you show me a simplified implementation of a Transformer model in TensorFlow?
                             </div>
                         </div>
                         
                         {/* AI Message */}
                         <div className="mb-6 p-4 rounded-2xl relative bg-transparent w-full px-2 lg:px-0">
                             <div className="text-[#fafafa] w-full text-sm md:text-base">
                                 <p className="mb-4">Here is a simplified implementation of a Multi-Head Attention layer, which is a core component of the Transformer model.</p>
                                 
                                 {/* Code Block Mock */}
                                 <div className="relative rounded-lg overflow-hidden border border-white/5 bg-[#09090b] mb-4 font-mono text-sm max-w-[100%]">
                                     <div className="flex items-center justify-between px-4 py-2 bg-[#18181b]/50 border-b border-white/5">
                                         <span className="text-xs text-gray-400">python</span>
                                         <div className="flex items-center gap-1.5 px-2 py-1 rounded text-gray-400 text-xs">
                                             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                             <span>Copy</span>
                                         </div>
                                     </div>
                                     <div className="p-4 overflow-x-hidden text-xs md:text-sm font-light">
                                         <pre className="text-zinc-300">
                                            <code>
                                                <div><span className="text-blue-400">import</span> numpy <span className="text-blue-400">as</span> np</div>
                                                <div><span className="text-blue-400">import</span> tensorflow <span className="text-blue-400">as</span> tf</div>
                                                <div className="h-4"></div>
                                                <div><span className="text-green-500"># Define multi-head attention layer</span></div>
                                                <div><span className="text-blue-400">class</span> <span className="text-teal-300">MultiHeadAttention</span>(tf.keras.layers.Layer):</div>
                                                <div>    <span className="text-blue-400">def</span> <span className="text-blue-300">__init__</span>(<span className="text-orange-300">self</span>, d_model, num_heads):</div>
                                                <div>        <span className="text-purple-400">super</span>(<span className="text-teal-300">MultiHeadAttention</span>, <span className="text-orange-300">self</span>).<span className="text-blue-300">__init__</span>()</div>
                                                <div>        <span className="text-orange-300">self</span>.num_heads = num_heads</div>
                                                <div>        <span className="text-orange-300">self</span>.d_model = d_model</div>
                                            </code>
                                         </pre>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Input Area Mock */}
                 <div className="shrink-0 w-full p-4 bg-[#09090b] border-t border-white/5 absolute bottom-0 left-0 right-0 pointer-events-none select-none">
                     <div className="max-w-4xl mx-auto">
                          <div className="w-full bg-[#18181b]/50 backdrop-blur-xl rounded-2xl p-4 border border-white/5 relative flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
                             <div className="grow mb-2">
                                 <div className="w-full bg-transparent text-[#52525b] text-[16px] leading-relaxed select-none">Send a message to Sidekick...</div>
                             </div>
                             <div className="flex items-end justify-between pt-2 px-1 border-t border-white/5 mt-2">
                                 <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent bg-white/5 text-[#a1a1aa]">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                                         <span>Search</span>
                                      </div>
                                      <div className="h-6 w-px bg-white/10 mx-1"></div>
                                      <div className="p-1.5 text-[#52525b] rounded-lg">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                      </div>
                                 </div>
                                 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 text-[#52525b]">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                                 </div>
                             </div>
                          </div>
                     </div>
                 </div>
             </div>
          </div>
        </div>
      </main>

      {/* Tech Strip */}
      <section id="tech-stack" className="py-12 border-y border-white/5 bg-transparent overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-medium text-[#52525b] uppercase tracking-widest mb-8">Powering the Architecture</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">React 19</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Tailwind v4</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">LangGraph</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">PostgreSQL</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Supabase</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" class="pt-24 pb-24 px-6 bg-[#09090b] relative overflow-hidden">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div class="max-w-7xl mx-auto">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">Features that drive results</h2>
                <p class="text-[#a1a1aa] max-w-2xl mx-auto">
                    Built for professionals who need an intelligent conversational workspace.
                </p>
            </div>

            <div class="grid md:grid-cols-3 gap-8 relative">
              <div class="text-center space-y-4 p-8 border border-white/5 rounded-lg bg-white/[0.02]">
                <div class="w-16 h-16 mx-auto bg-[#18181b] rounded-lg flex items-center justify-center shadow-xl">
                  <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold">Document Intelligence</h3>
                <p class="text-[#a1a1aa] text-sm leading-relaxed">Upload and analyze documents with ease. Sidekick extracts key information, summarizes content, and answers questions about your files.</p>
              </div>

              <div class="text-center space-y-4 p-8 border border-white/5 rounded-lg bg-white/[0.02]">
                <div class="w-16 h-16 mx-auto bg-[#18181b] rounded-lg flex items-center justify-center shadow-xl">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold">Persistent Memory</h3>
                <p class="text-[#a1a1aa] text-sm leading-relaxed">Sidekick learns your preferences, project details and recalls conversations across sessions for a truly personalized workflow.</p>
              </div>

              {/* Real-time Grounding */}
              <div className="text-center space-y-4 p-8 border border-white/5 rounded-xl bg-white/[0.02]">
                <div className="w-16 h-16 mx-auto bg-[#18181b] rounded-lg flex items-center justify-center shadow-xl">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Real-time Grounding</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed">
                  Equipped with autonomous search tools, Sidekick browses the live web to verify facts and provide up-to-the-minute information for critical tasks.
                </p>
              </div>
            </div>
        </div>
    </section>

      {/* Frequently Asked Questions (FAQ) */}
      <section id="faqs" className="py-24 px-6 border-t border-white/5 bg-[#09090b]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                question: 'What makes Sidekick different from other AI chatbots?',
                answer: 'Most AI chatbots are "wrappers" that simply relay your input to a large language model. Sidekick goes beyond that by integrating autonomous tools, persistent memory, and real-time web grounding. It doesn\'t just answer questions; it takes action, remembers context, and verifies information, making it a true conversational workspace.'
              },
              {
                question: 'Does Sidekick have free usage?',
                answer: 'Yes. Sidekick is fundamentally an open-source project. You can use our hosted demo to experience the capabilities immediately, or clone the repository to self-host your own instance with no subscription fees.',
              },
              {
                question: 'How is my data handled?',
                answer: 'If you use the hosted demo, your chat history and files are temporarily stored in Supabase and Cloudinary. For strict data privacy, we highly recommend cloning the repository. By self-hosting Sidekick, you control the database and API keys, ensuring complete data ownership.'
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`border border-white/10 rounded-lg bg-[#18181b]/50 overflow-hidden transition-all duration-300 hover:bg-[#18181b]`}
              >
                <button
                  onClick={() => toggleNote(index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer"
                >
                  <span className="font-medium text-lg">{item.question}</span>
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 text-[#a1a1aa] ${activeNote === index ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    display: 'grid',
                    gridTemplateRows: activeNote === index ? '1fr' : '0fr',
                  }}
                >
                  <div className="overflow-hidden">
                    <div
                      className={`px-6 pb-6 text-[#a1a1aa] leading-relaxed transition-opacity duration-300 ${activeNote === index ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {item.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-[#09090b] border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-[#09090b] to-[#09090b] opacity-50"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Ready to boost your productivity?</h2>
          <p className="text-xl text-[#a1a1aa] mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who are already using Sidekick as their go-to chatting partner
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/chat" className="w-full sm:w-auto px-8 py-3.5 bg-[#fafafa] border border-transparent text-[#18181b] font-medium rounded-lg hover:bg-[#fafafa]/90 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group">
              Try the Demo
            </Link>
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#fafafa] font-medium rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              View Source Code
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#09090b] text-sm text-[#a1a1aa]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10 md:gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.75">
              <div className="w-6 h-6 rounded-md bg-linear-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
              <span className="font-bold text-white text-xl">Sidekick</span>
            </div>
            <p className="md:whitespace-nowrap leading-relaxed">Agentic conversational AI built for learning purposes.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 font-medium">
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Github Repository</a>
            <a href="mailto:savanijuhil@gmail.com" className="hover:text-white transition-colors">Contact Developer</a>
          </div>

          <div className="text-left md:text-right">
            <p>© 2026 Sidekick. Open Source Project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
