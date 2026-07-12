import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { forgotPasswordAction } from "@/utils/actions/authorize.actions";

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ identifier }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const result = await forgotPasswordAction({ identifier });
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
              Enter your username or email address and we'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-in fade-in slide-in-from-top-2 duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-in fade-in slide-in-from-top-2 duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium leading-none block">Username or Email</label>
              <input
                id="identifier"
                type="text"
                placeholder="username or email@example.com"
                {...register("identifier", {
                  required: "Username or email is required",
                  setValueAs: (value) => value.trim(),
                  validate: (value) => {
                    const isEmail = value.includes("@");
                    if (isEmail) {
                      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                      return emailRegex.test(value) || "Invalid email address";
                    }
                    return true;
                  }
                })}
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-[#27272a] bg-white/5 px-3 py-2 text-sm placeholder:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white/10 ring-offset-[#09090b]"
              />
              {errors.identifier && <span className="text-xs text-red-500 block">{errors.identifier.message}</span>}
            </div>


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
