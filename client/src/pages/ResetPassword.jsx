import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordAction } from "@/utils/actions/authorize.actions";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isValidLink, setIsValidLink] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Parse the hash parameters inserted by Supabase
    const hash = window.location.hash;
    if (!hash) {
      setIsValidLink(false);
      return;
    }

    const params = new URLSearchParams(hash.substring(1)); // Remove the leading #
    const token = params.get("access_token");
    const type = params.get("type");

    if (type !== "recovery" || !token) {
      setIsValidLink(false);
    } else {
      setAccessToken(token);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await resetPasswordAction({
        access_token: accessToken,
        new_password: newPassword,
      });

      if (result.error) {
        setError(result.error);
      } else {
        // Successfully reset password, redirect to login
        navigate("/login", { replace: true });
      }
    } catch (e) {
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isValidLink) {
    return (
      <div className="antialiased min-h-dvh flex items-center justify-center relative overflow-hidden bg-[#09090b] text-[#fafafa] font-sans">
        <style>{`
          .glass-card { background: rgba(9, 9, 11, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
          .hero-glow { background: radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%); }
        `}</style>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hero-glow pointer-events-none -z-10"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="w-full max-w-lg p-6 relative z-10">
          <div className="glass-card rounded-xl p-8 shadow-2xl text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Invalid Link</h1>
            <p className="text-sm text-[#a1a1aa] mb-6">This password reset link is invalid or has expired.</p>
            <Link 
              to="/forgot-password" 
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-[#09090b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 h-10 px-4 py-2"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased min-h-dvh flex items-center justify-center relative overflow-hidden bg-[#09090b] text-[#fafafa] font-sans">
      <style>{`
        .glass-card { background: rgba(9, 9, 11, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .hero-glow { background: radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%); }
      `}</style>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hero-glow pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-lg p-6 relative z-10">
        <div className="glass-card rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-sm text-[#a1a1aa] mt-2">Enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none block">New Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="flex h-10 w-full rounded-md border border-[#27272a] bg-white/5 px-3 py-2 pr-10 text-sm placeholder:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white/10 ring-offset-[#09090b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium leading-none block">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="flex h-10 w-full rounded-md border border-[#27272a] bg-white/5 px-3 py-2 pr-10 text-sm placeholder:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white/10 ring-offset-[#09090b]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-[#09090b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 h-10 px-4 py-2 mt-2"
            >
              {loading ? (
                 <div className="w-5 h-5 border-2 border-zinc-500 border-t-zinc-900 rounded-full animate-spin" />
              ) : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
