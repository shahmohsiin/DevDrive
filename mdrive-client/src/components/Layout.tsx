import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  ChevronRight,
  MessageSquare,
  StickyNote,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Titlebar } from "./Titlebar";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useState, useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { getAppSettings } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { to: "/", label: "Drive", icon: <LayoutDashboard size={18} /> },
  { to: "/?sidebar=community", label: "Chat", icon: <MessageSquare size={18} /> },
  { to: "/?sidebar=notes", label: "Notes", icon: <StickyNote size={18} /> },
];

const adminItems = [
  { to: "/admin/users", label: "Users", icon: <Users size={18} /> },
  { to: "/admin/settings", label: "Settings", icon: <SettingsIcon size={18} /> },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [tagline, setTagline] = useState("For Developers");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin";

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

    const handleUpdate = (e: any) => {
      if (e.detail?.tagline) setTagline(e.detail.tagline);
    };
    window.addEventListener("settings-updated", handleUpdate);
    return () => window.removeEventListener("settings-updated", handleUpdate);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 bg-surface-primary flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="DevDrive Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-text-primary tracking-tighter truncate">
              DevDrive
            </h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-semibold truncate">
              {tagline}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isDashboard = item.to === "/";
          const hasSidebarParam = window.location.search.includes("sidebar=");
          
          const isCommunityMatch = item.label === "Chat" && window.location.search.includes("sidebar=community");
          const isNotesMatch = item.label === "Notes" && window.location.search.includes("sidebar=notes");
          const isDashboardMatch = isDashboard && !hasSidebarParam;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={isDashboard}
              className={({ isActive }) => {
                const effectivelyActive = (isActive && isDashboardMatch) || isCommunityMatch || isNotesMatch;
                return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  effectivelyActive
                    ? "bg-surface-active text-text-primary shadow-sm"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`;
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              <ChevronRight size={14} className="opacity-0 lg:group-hover:opacity-50 transition-opacity" />
            </NavLink>
          );
        })}

        {isAdmin && (
          <div className="mt-8 pt-6 border-t border-border-default">
            <p className="px-4 mb-4 text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">Administration</p>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-surface-active text-text-primary shadow-sm"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border-default bg-surface-secondary/50">
        <div className="flex items-center gap-3 px-3 py-3 mb-2">
           <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs ring-1 ring-blue-500/20">
              {user?.displayName?.[0] || user?.email?.[0] || "?"}
           </div>
           <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{user?.displayName || "Guest"}</p>
              <p className="text-[10px] text-text-muted truncate lowercase">{user?.email}</p>
           </div>
        </div>
        
        <div className="space-y-1">
          <button 
            onClick={() => setShowResetPassword(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all duration-200 uppercase tracking-widest"
          >
            Reset Password
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all duration-200 uppercase tracking-widest"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-primary">
      <Titlebar />
      
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border-default">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-md opacity-80" />
          <span className="font-bold text-sm tracking-tighter">DevDrive</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg bg-surface-hover text-text-secondary"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col border-r border-border-default bg-surface-secondary">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              />
              <motion.aside 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-[101] bg-surface-secondary flex flex-col shadow-2xl"
              >
                <div className="absolute right-4 top-4">
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full bg-white/5 text-text-muted"><X size={20} /></button>
                </div>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content */}
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal 
        isOpen={showResetPassword} 
        onClose={() => setShowResetPassword(false)} 
      />
    </div>
  );
}
