import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Minus, Square, Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export function Titlebar() {
  const { theme, toggleTheme } = useTheme();
  const appWindow = getCurrentWindow();

  return (
    <div 
      data-tauri-drag-region 
      className="h-10 flex items-center justify-between px-4 bg-surface-secondary border-b border-white/[0.03] select-none sticky top-0 z-[100]"
    >
      <div 
        data-tauri-drag-region 
        className="flex items-center gap-2 pointer-events-none"
      >
        <div data-tauri-drag-region className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white overflow-hidden shadow-sm">
          <img 
            src="/logo.png" 
            alt="DevDrive" 
            className="w-full h-full object-cover"
          />
        </div>
        <span data-tauri-drag-region className="text-[10px] font-bold text-text-primary tracking-widest uppercase">DevDrive</span>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={toggleTheme}
          className="h-full px-3 text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button
          onClick={async () => await appWindow.minimize()}
          className="h-full px-4 text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          <Minus size={14} />
        </button>
        
        <button
          onClick={async () => await appWindow.toggleMaximize()}
          className="h-full px-4 text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          <Square size={10} />
        </button>

        <button
          onClick={async () => await appWindow.close()}
          className="h-full px-4 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
