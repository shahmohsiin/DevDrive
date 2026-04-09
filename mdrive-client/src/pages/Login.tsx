import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, HelpCircle } from "lucide-react";
import { Titlebar } from "../components/Titlebar";
import logo from "../logo.png";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // Use the logo from the artifacts directory if available, 
  // otherwise fallback to a styled placeholder
  return (
    <div className="h-screen flex flex-col bg-surface-primary overflow-hidden select-none">
      <Titlebar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Brand & Visuals */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 relative bg-gradient-to-br from-blue-900/40 via-surface-primary to-surface-primary border-r border-white/5">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
             <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-[160px]" />
             <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-600 rounded-full blur-[140px]" />
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 relative z-10"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
               <img src={logo} alt="DevDrive" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold tracking-[0.4em] text-text-primary">DEVDRIVE</span>
          </motion.div>

          <div className="relative z-10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-bold leading-tight tracking-tight text-text-primary mb-6"
            >
              Seamless Codebase & Data <span className="text-blue-500">Migration.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-text-muted font-medium max-w-sm leading-relaxed"
            >
              Share, migrate, and synchronize your code and data across environments securely and instantly.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            className="text-[10px] font-bold text-text-muted uppercase tracking-[0.5em] relative z-10"
          >
            Powered by Vercel Edge Network
          </motion.div>
        </div>

        {/* Right Side: Minimal Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface-primary relative">
          <div className="absolute inset-0 lg:hidden pointer-events-none opacity-10">
             <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500 rounded-full blur-[120px]" />
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm space-y-10"
          >
            <div className="lg:hidden text-center mb-12 flex flex-col items-center">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-surface-secondary border border-border-default p-2 inline-flex items-center justify-center overflow-hidden">
                <img src={logo} alt="DevDrive" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">DevDrive Login</h1>
            </div>

            <div className="space-y-2">
               <h3 className="text-xl font-bold text-text-primary tracking-tight">Welcome Back</h3>
               <p className="text-xs text-text-muted font-medium">Please sign in to access your data and code.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-border-default text-sm text-text-primary placeholder:text-text-muted/20 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all font-medium"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-border-default text-sm text-text-primary placeholder:text-text-muted/20 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[11px] text-rose-400 font-bold text-center uppercase tracking-wide">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 relative overflow-hidden"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waking up server...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                  </span>
                )}
                {loading && (
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    />
                )}
              </button>
            </form>

            <div className="pt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-1.5 opacity-20 italic">
                  <HelpCircle size={10} className="text-text-muted" />
                  <span className="text-[9px] text-text-muted font-bold tracking-widest uppercase">System Protocol 4.8</span>
                </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
