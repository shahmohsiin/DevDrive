import { 
  X, 
  Clock, 
  Activity, 
  FilePlus, 
  FileEdit, 
  Trash2, 
  FolderPlus,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 1000 * 60 * 60 * 24) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "file.upload": return <FilePlus size={12} className="text-emerald-500" />;
    case "file.rename": return <FileEdit size={12} className="text-blue-500" />;
    case "file.delete": return <Trash2 size={12} className="text-rose-500" />;
    case "folder.create": return <FolderPlus size={12} className="text-amber-500" />;
    default: return <Activity size={12} className="text-blue-500" />;
  }
};

interface ActivityItem {
  _id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  action: string;
  details: string;
  timestamp: string;
}

interface HistorySidebarProps {
  activity: ActivityItem[];
  loading: boolean;
  isAdmin?: boolean;
  onClose: () => void;
}

export function HistorySidebar({ activity, loading, isAdmin, onClose }: HistorySidebarProps) {
  return (
    <motion.div 
      initial={{ x: 400 }} 
      animate={{ x: 0 }} 
      exit={{ x: 400 }} 
      className="absolute right-0 top-0 bottom-0 w-[400px] border-l border-border-default bg-surface-primary/95 flex flex-col z-[50] backdrop-blur-3xl shadow-2xl"
    >
      <div className="p-5 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-text-primary">Journal</h3>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter opacity-50">Folder Activity Log</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Querying Node Ledger</p>
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-32 space-y-4 px-10">
            <div className="w-16 h-16 rounded-[24px] bg-surface-hover mx-auto flex items-center justify-center border border-white/5 opacity-40">
              <Activity size={32} />
            </div>
            <p className="text-xs text-text-muted font-black uppercase tracking-widest opacity-40 leading-relaxed">System status nominal. <br/> No recent operations recorded.</p>
          </div>
        ) : (
          activity.map((item) => (
            <div key={item._id} className="relative pl-8 border-l-2 border-border-default pb-8 group last:pb-0">
              <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-surface-primary border-2 border-border-default flex items-center justify-center shadow-lg group-hover:border-blue-500 transition-colors">
                 <div className="w-1.5 h-1.5 rounded-full bg-border-default group-hover:bg-blue-500 transition-colors" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="p-1.5 rounded-lg bg-surface-hover border border-white/5">
                        {getActionIcon(item.action)}
                     </div>
                     <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.1em]">
                       {item.action.split(".")[1] || item.action}
                     </span>
                  </div>
                  <span className="text-[9px] font-mono text-text-muted tabular-nums bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
                
                <p className="text-xs text-text-secondary leading-relaxed font-bold">
                  {item.details}
                </p>
                
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
                        {item.userName?.charAt(0) || "U"}
                      </div>
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">
                        {item.userName || item.userEmail.split("@")[0]}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-surface-primary/30 border-t border-border-default flex items-center justify-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
         <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.4em]">Audit Sequence Nominal</p>
      </div>
    </motion.div>
  );
}
