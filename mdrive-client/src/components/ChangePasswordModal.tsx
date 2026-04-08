import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { changePassword } from "../lib/api";
import { 
  X, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle 
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
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
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-secondary rounded-[32px] border border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.3em]">Security</span>
                <span className="text-[10px] text-text-muted opacity-20">/</span>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Password</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80 ml-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full bg-white/[0.02] border-b border-white/5 p-1 text-sm text-text-primary outline-none focus:border-blue-500/50 transition-all placeholder:opacity-10"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80 ml-1">New Password</label>
                  <input
                    type="password"
                    className="w-full bg-white/[0.02] border-b border-white/5 p-1 text-sm text-text-primary outline-none focus:border-blue-500/50 transition-all placeholder:opacity-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-80 ml-1">Confirm New Password</label>
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

              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                  <AlertTriangle size={14} />
                  <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                  <ShieldCheck size={14} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Update successful</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 rounded-2xl shadow-lg shadow-blue-600/20 font-black uppercase tracking-widest text-[10px]">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Update Password"}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
