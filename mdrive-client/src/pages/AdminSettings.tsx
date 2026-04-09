import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle2 } from "lucide-react";
import { getAppSettings, updateAppSettings } from "../lib/api";

export function AdminSettingsPage() {
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await getAppSettings();
        if (res.data) {
          setTagline(res.data.tagline);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateAppSettings({ tagline });
      if (res.success) {
        setMessage({ type: "success", text: "Settings updated successfully!" });
        // Event for other components to refresh
        window.dispatchEvent(new CustomEvent("settings-updated", { detail: { tagline } }));
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update settings" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full opacity-30">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-10">
        <div>
          <h2 className="text-2xl font-black text-text-primary flex items-center gap-3 uppercase tracking-tighter">
             <Settings className="text-accent-blue" />
             General Settings
          </h2>
          <p className="text-sm text-text-muted mt-2 font-medium">Manage global application configuration and branding.</p>
        </div>

        <div className="glass rounded-[32px] p-1 border border-white/5 shadow-2xl overflow-hidden">
          <div className="p-8 space-y-8">
            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">
                  Brand Tagline
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-primary/50 border border-border-default rounded-2xl px-5 py-4 text-sm font-medium text-text-primary focus:ring-1 focus:ring-accent-blue/50 outline-none transition-all placeholder:opacity-20 shadow-inner"
                  placeholder="e.g. JAR File Store"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
                <p className="text-[10px] text-text-muted/60 ml-1 italic font-medium">
                  This text appears below the logo in the sidebar and on the splash screen.
                </p>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${
                  message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                }`}>
                  {message.type === "success" && <CheckCircle2 size={16} />}
                  <span className="text-xs font-bold uppercase tracking-widest">{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !tagline.trim()}
                className="btn-primary w-fit px-8 py-3.5 flex items-center gap-2 group shadow-xl shadow-accent-blue/10"
              >
                {saving ? "Saving..." : (
                  <>
                    <Save size={16} className="group-hover:rotate-12 transition-transform" />
                    Save Settings
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
