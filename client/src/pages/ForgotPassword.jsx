import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordAction } from "@/utils/actions/authorize.actions";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const result = await forgotPasswordAction({ email });
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message || "Password reset link sent! Check your email.");
      }
    } catch (e) {
      setError("Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="antialiased min-h-dvh flex items-center justify-center relative overflow-hidden bg-[#09090b] text-[#fafafa] font-sans">
      <style>{`
        .glass-card {
            background: rgba(9, 9, 11, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-glow {
            background: radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
        }
      `}</style>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hero-glow pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-lg p-6 relative z-10">
        <div className="glass-card rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-sm text-[#a1a1aa] mt-2">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none block">Email</label>
              <input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="flex h-10 w-full rounded-md border border-[#27272a] bg-white/5 px-3 py-2 text-sm placeholder:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white/10 ring-offset-[#09090b]"
              />
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <span>{message}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-[#09090b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 h-10 px-4 py-2 mt-2"
            >
              {loading ? (
                 <div className="w-5 h-5 border-2 border-zinc-500 border-t-zinc-900 rounded-full animate-spin" />
              ) : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="font-medium text-[#fafafa] underline-offset-4 hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
