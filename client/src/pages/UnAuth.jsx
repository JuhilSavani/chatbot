import { Link } from "react-router-dom"

function UnAuth() {
  return (
    <div className="antialiased min-h-dvh flex flex-col items-center justify-center relative overflow-hidden bg-[#09090b] text-[#fafafa] font-sans">
      <style>{`
        .glass-card {
            background: rgba(9, 9, 11, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-glow {
            background: radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
        }
      `}</style>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hero-glow pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="glass-card p-12 rounded-2xl max-w-lg text-center shadow-2xl relative z-10">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Access Denied</h1>
        <p className="text-[#a1a1aa] mb-8 leading-relaxed">
          You don't have permission to access this page. Please log in with an authorized account or contact support.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link 
            to="/login" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 h-10 px-6 py-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            Log In
          </Link>
          <Link 
            to="/" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-[#27272a] bg-white/5 hover:bg-white/10 hover:text-[#fafafa] h-10 px-6 py-2 transition-colors"
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UnAuth