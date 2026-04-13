import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface TransferState {
  id: string;
  fileName: string;
  type: 'upload' | 'download';
  status: 'pending' | 'progress' | 'completed' | 'error' | 'cancelled';
  percentage: number;
  bytesTransferred: number;
  totalBytes: number;
}

interface TransferMonitorProps {
  transfers: TransferState[];
  handleCancelUpload: (id: string) => void;
  formatSize: (bytes: number) => string;
}

export function TransferMonitor({ transfers, handleCancelUpload, formatSize }: TransferMonitorProps) {
  if (transfers.length === 0) return null;

  return (
    <motion.div 
      initial={{ y: -50, opacity: 0, x: "-50%" }} 
      animate={{ y: 0, opacity: 1, x: "-50%" }} 
      exit={{ y: -50, opacity: 0, x: "-50%" }} 
      className="fixed top-24 left-1/2 z-[100] flex flex-col items-center gap-3 w-80 pointer-events-none"
    >
      {transfers.map(t => (
        <motion.div 
          key={t.id} 
          layout
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 50, opacity: 0 }}
          className="pointer-events-auto w-full bg-surface-secondary/20 backdrop-blur-3xl rounded-[20px] p-4 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden group"
        >
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${t.percentage}%` }} 
            className={`absolute top-0 left-0 h-[2px] opacity-70 transition-all duration-300 ${t.status === 'error' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : t.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} 
          />
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : t.status === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white'}`}>
              {t.status === 'completed' ? <CheckCircle2 size={14} /> : t.status === 'error' ? <AlertCircle size={14} /> : <Loader2 className="animate-spin" size={14} />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-black text-text-primary truncate tracking-wider uppercase">
                  {t.fileName}
                </span>
                {t.status !== 'completed' && t.status !== 'error' && (
                  <span className="text-[9px] font-black text-blue-400 tabular-nums">
                    {Math.round(t.percentage)}%
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-[9px] text-text-muted font-bold tracking-tight opacity-60">
                  {t.status === 'completed' ? 'SYNCED' : t.status === 'error' ? 'FAILED' : `${formatSize(t.bytesTransferred)} / ${formatSize(t.totalBytes)}`}
                </div>
                {t.type === "upload" && (t.status === "pending" || t.status === "progress") && (
                  <button
                    onClick={() => handleCancelUpload(t.id)}
                    className="text-[8px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-[0.2em] transition-colors"
                  >
                    ABORT
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
