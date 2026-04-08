import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getConfig, updateConfig } from "../lib/tauri";
import { useAuth } from "../hooks/useAuth";
import { changePassword } from "../lib/api";
import { 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  User, 
  Cloud, 
  Lock, 
  Info,
  Globe,
  HardDrive
} from "lucide-react";

export function SettingsPage() {
  const { user } = useAuth();
  const [apiUrl, setApiUrl] = useState("");
  const [downloadPath, setDownloadPath] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const config = await getConfig();
      setApiUrl(config.api_url);
      setDownloadPath(config.default_download_path || "");
      checkConnection(config.api_url);
    } catch {
      // defaults
    } finally {
      setLoading(false);
    }
  }

  async function checkConnection(url: string) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${url}/auth/me`, { signal: controller.signal });
      setIsOnline(res.ok);
      clearTimeout(timeout);
    } catch {
      setIsOnline(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateConfig({
        apiUrl: apiUrl.replace(/\/$/, ""),
        defaultDownloadPath: downloadPath || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      checkConnection(apiUrl);
    } catch {
      // silent fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 opacity-40" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-surface-primary">
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 space-y-20">
        
        {/* Identity Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.3em]">Identity</span>
            <span className="text-[10px] text-text-muted opacity-20">/</span>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Operator</label>
              <p className="text-sm font-bold text-text-primary">{user?.displayName}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Access Permissions</label>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <p className="text-[10px] font-black text-text-primary uppercase tracking-widest">{user?.role}</p>
              </div>
            </div>
            <div className="md:col-span-2 space-y-1.5 pt-4 border-t border-white/[0.03]">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Cloud Address</label>
              <p className="text-sm font-bold text-text-primary">{user?.email}</p>
            </div>
          </div>
        </motion.section>

        {/* Workspace Link Section */}
        <form onSubmit={handleSave}>
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.3em]">Workspace</span>
                <span className="text-[10px] text-text-muted opacity-20">/</span>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Cloud Link</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'} opacity-80`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-60">
                  {isOnline ? 'Stable' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80">
                  API Endpoint
                </label>
                <input
                  type="url"
                  className="w-full bg-white/[0.02] border-b border-white/5 p-1 text-sm font-bold text-blue-400 outline-none focus:border-blue-500/50 transition-all font-mono placeholder:opacity-20"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://cloud.mdrive.com"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80">
                  Local Storage Hub
                </label>
                <input
                  type="text"
                  className="w-full bg-white/[0.02] border-b border-white/5 p-1 text-sm font-bold text-text-primary outline-none focus:border-blue-500/50 transition-all placeholder:opacity-20"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  placeholder="/Users/sat/Downloads"
                />
              </div>

              <div className="flex items-center gap-6 pt-6">
                <button type="submit" className="btn-primary py-2 px-8 rounded-full shadow-lg shadow-blue-600/20">
                  Commit Changes
                </button>
                {saved && (
                  <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Commited</span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.section>
        </form>

        {/* Security Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-10"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.3em]">Security</span>
            <span className="text-[10px] text-text-muted opacity-20">/</span>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Encryption</span>
          </div>

          <ChangePasswordForm />
        </motion.section>

        {/* System Core Section */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-20 border-t border-white/5 space-y-8"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-black text-text-primary uppercase tracking-tighter italic">DevDrive System Fabric</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] opacity-40">Version 1.2.0 Build 1042</p>
            </div>
            
            <button 
              onClick={() => { if(confirm("ABORT SYSTEM DATA? This will wipe all local caches.")) { localStorage.clear(); window.location.reload(); } }}
              className="text-[9px] font-black text-rose-500/40 hover:text-rose-500 transition-colors uppercase tracking-[0.2em]"
            >
              Purge App Identity
            </button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Keys do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Key too short");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword({ oldPassword, newPassword });
      if (res.success) {
        setSuccess(true);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(res.error || "Update aborted");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failure");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80">Current Cipher Key</label>
          <input
            type="password"
            className="w-full bg-white/[0.02] border-b border-white/5 p-1 text-sm text-text-primary outline-none focus:border-blue-500/50 transition-all placeholder:opacity-10"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            placeholder="••••••••••••"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80">New Cipher Key</label>
            <input
              type="password"
              className="w-full bg-white/[0.02] border-b border-white/5 p-1 text-sm text-text-primary outline-none focus:border-blue-500/50 transition-all placeholder:opacity-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••••••"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80">Confirm New Key</label>
            <input
              type="password"
              className="w-full bg-white/[0.02] border-b border-white/5 p-1 text-sm text-text-primary outline-none focus:border-blue-500/50 transition-all placeholder:opacity-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••••••"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-500">
          <AlertTriangle size={14} />
          <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck size={14} />
          <p className="text-[10px] font-black uppercase tracking-widest">Rotated successfully</p>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary py-2 px-8 rounded-full shadow-lg shadow-blue-600/20">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Rotate Cipher Key"}
      </button>
    </form>
  );
}
