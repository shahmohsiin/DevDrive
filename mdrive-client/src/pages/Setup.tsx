import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { updateConfig } from "../lib/tauri";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Server, HelpCircle } from "lucide-react";
import { Titlebar } from "../components/Titlebar";
import { useEffect } from "react";
import { getAppSettings } from "../lib/api";
import logo from "../logo.png";

export function SetupPage() {
  const [step, setStep] = useState<"api" | "register">("api");
  const [apiUrl, setApiUrl] = useState("http://localhost:4001");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tagline, setTagline] = useState("For Developers");
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await getAppSettings();
        if (res.data) setTagline(res.data.tagline);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    }
    fetchSettings();
  }, []);

  async function handleApiSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await updateConfig({ apiUrl: apiUrl.replace(/\/$/, "") });

      // Test connection
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/health`);
      if (!res.ok) throw new Error("Cannot reach the API server");

      setStep("register");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Cannot connect to the API server"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { isFirstUser } = await register({
        email,
        password,
        displayName,
      });

      if (isFirstUser) {
        navigate("/");
      } else {
        navigate("/login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-surface-primary overflow-hidden select-none">
      <Titlebar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Onboarding Context */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 relative bg-gradient-to-br from-indigo-900/40 via-surface-primary to-surface-primary border-r border-white/5">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
             <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full blur-[160px]" />
             <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-600 rounded-full blur-[140px]" />
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
               <img src={logo} alt="DevDrive" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold tracking-[0.4em] text-text-primary uppercase">Loading</span>
          </motion.div>

          <div className="relative z-10">
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-bold leading-tight tracking-tight text-text-primary mb-6">
              Connect to Your <br /> Cloud <span className="text-indigo-500">Workspace.</span>
            </motion.h2>
            <p className="text-sm text-text-muted font-medium max-w-sm leading-relaxed">
              {tagline} — Secure codebase and data store.
            </p>
          </div>

          <div className="flex items-center gap-1.5 opacity-30 italic relative z-10">
             <HelpCircle size={10} className="text-text-muted" />
              <span className="text-[9px] text-text-muted font-bold tracking-widest uppercase">Client Setup</span>
          </div>
        </div>

        {/* Right Side: Setup Form */}
        <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-16 bg-surface-primary relative overflow-y-auto">
          <div className="max-w-md mx-auto w-full">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => step === "register" ? setStep("api") : navigate("/login")}
              className="flex items-center gap-2 text-[10px] font-bold text-text-muted hover:text-blue-400 transition-colors uppercase tracking-widest mb-12"
            >
              <ChevronLeft size={14} />
              {step === "register" ? "Back to Server Config" : "Back to Login"}
            </motion.button>

            <div className="space-y-2 mb-10">
               <h3 className="text-2xl font-bold text-text-primary tracking-tight">
                   {step === "api" ? "Server Connectivity" : "Account Setup"}
                </h3>
                <p className="text-xs text-text-muted font-medium">Step {step === "api" ? "1" : "2"} of 2 — {step === "api" ? "Connecting to server" : "Configure administrator"}</p>
            </div>

            <div className="flex gap-2 mb-10">
               <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === "api" ? "bg-blue-500" : "bg-emerald-500"}`} />
               <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === "register" ? "bg-blue-500" : "bg-white/10"}`} />
            </div>

            <AnimatePresence mode="wait">
              {step === "api" ? (
                <motion.form
                  key="api"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleApiSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label htmlFor="setup-api-url" className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                          Migration Server Address
                       </label>
                       <div className="relative group">
                          <Server size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/30 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            id="setup-api-url"
                            type="url"
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-border-default text-sm text-text-primary placeholder:text-text-muted/20 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all font-mono"
                            placeholder="https://cloud.devdrive.com"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            required
                          />
                       </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <p className="text-[11px] text-rose-400 font-bold text-center uppercase tracking-wide">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/40 transition-all disabled:opacity-50 relative overflow-hidden flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Server size={14} className="animate-pulse" />
                        Connecting...
                      </>
                    ) : (
                      "Verify Connection"
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
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleRegister}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="setup-name" className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                        Administrator Name
                      </label>
                      <input
                        id="setup-name"
                        type="text"
                        className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-border-default text-sm text-text-primary placeholder:text-text-muted/20 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all font-medium"
                        placeholder="Admin"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="setup-email" className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                        Email Address
                      </label>
                      <input
                        id="setup-email"
                        type="email"
                        className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-border-default text-sm text-text-primary placeholder:text-text-muted/20 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="setup-password" className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                        Administrator Password
                      </label>
                      <input
                        id="setup-password"
                        type="password"
                        className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-border-default text-sm text-text-primary placeholder:text-text-muted/20 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <p className="text-[11px] text-rose-400 font-bold text-center uppercase tracking-wide">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {loading ? "Setting up account..." : "Finish Setup"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
