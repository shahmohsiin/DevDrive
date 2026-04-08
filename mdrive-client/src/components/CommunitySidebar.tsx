import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  X, 
  MessageSquare,
  Send,
  Loader2,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  File as FileIconLucide,
  CheckCircle2,
  Plus,
  Smile,
  Reply,
  Trash2,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getFolderChat, 
  sendFolderMessage, 
  getFolderFiles
} from "../lib/api";
import { useAuth } from "../hooks/useAuth";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes("image")) return <FileImage size={14} className="text-pink-400" />;
  if (mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("json")) return <FileCode size={14} className="text-yellow-400" />;
  if (mimeType.includes("pdf") || mimeType.includes("text")) return <FileText size={14} className="text-blue-400" />;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return <FileArchive size={14} className="text-purple-400" />;
  return <FileIconLucide size={14} className="text-text-muted" />;
};

const getUserColor = (name: string) => {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-purple-500", "bg-indigo-500", "bg-cyan-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

interface ChatAttachment {
  fileId: string;
  fileName: string;
  size: number;
  mimeType: string;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  attachments?: ChatAttachment[];
  createdAt: string;
}

interface FileItem {
  _id: string;
  fileName: string;
  size: number;
  mimeType: string;
}

interface CommunitySidebarProps {
  folderId: string | null;
  onClose: () => void;
}

export function CommunitySidebar({ folderId, onClose }: CommunitySidebarProps) {
  const { user } = useAuth();
  const [width, setWidth] = useState(parseInt(localStorage.getItem('chat-width') || '400'));
  const [isResizing, setIsResizing] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [folderFiles, setFolderFiles] = useState<FileItem[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<FileItem[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const calcWidth = e.clientX - 240; 
      if (calcWidth >= 300 && calcWidth <= 700) {
        setWidth(calcWidth);
        localStorage.setItem('chat-width', calcWidth.toString());
      }
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (folderId) {
      fetchChat();
      const interval = setInterval(fetchChat, 5000);
      return () => clearInterval(interval);
    }
  }, [folderId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchChat() {
    if (!folderId) return;
    try {
      const res = await getFolderChat(folderId);
      if (res.success && res.data) setMessages(res.data as any);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFolderFiles() {
    if (!folderId) return;
    try {
      const res = await getFolderFiles(folderId);
      if (res.success) setFolderFiles(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!folderId || (!newMessage.trim() && selectedAttachments.length === 0) || sending) return;
    setSending(true);
    try {
      const attachments = selectedAttachments.map(f => ({ fileId: f._id, fileName: f.fileName, size: f.size, mimeType: f.mimeType }));
      const res = await sendFolderMessage(folderId, newMessage.trim(), attachments);
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data as any]);
        setNewMessage("");
        setSelectedAttachments([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  const toggleAttachment = (file: FileItem) => {
    setSelectedAttachments(prev => 
      prev.find(f => f._id === file._id) ? prev.filter(f => f._id !== file._id) : [...prev, file]
    );
  };

  const groupedMessages = useMemo(() => {
    const groups: any[] = [];
    messages.forEach((msg, idx) => {
      const prevMsg = messages[idx - 1];
      const isSameUser = prevMsg && prevMsg.senderId === msg.senderId;
      const withinTimeLimit = prevMsg && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000);
      if (isSameUser && withinTimeLimit) {
        groups[groups.length - 1].messages.push(msg);
      } else {
        groups.push({ senderId: msg.senderId, senderName: msg.senderName, messages: [msg], timeRange: formatDate(msg.createdAt) });
      }
    });
    return groups;
  }, [messages]);

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }} 
      animate={{ width: width, opacity: 1 }} 
      exit={{ width: 0, opacity: 0 }} 
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="h-full border-r border-border-default bg-surface-secondary/80 flex flex-col shrink-0 relative overflow-hidden group/sidebar backdrop-blur-3xl"
      style={{ width }}
    >
      {/* Resizer Handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500/50 transition-colors z-[65]"
      />
      {/* Retract Handle */}
      <button 
        onClick={onClose}
        className="absolute -right-3 top-1/2 -translate-y-12 w-6 h-12 bg-surface-active border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-emerald-500 opacity-0 group-hover/sidebar:opacity-100 transition-all z-[61] shadow-lg"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Header */}
      <div className="p-5 border-b border-border-default flex items-center justify-between bg-surface-secondary/30">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald`}>
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-text-primary">Community</h3>
            <div className="flex items-center gap-1.5 opacity-60">
               <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
               <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.1em]">Node Active</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-text-muted transition-all">
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar-minimal relative p-0 bg-surface-primary/10">
        {!folderId ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-10 space-y-6 opacity-30">
            <div className="w-20 h-20 rounded-[32px] bg-surface-hover flex items-center justify-center text-text-muted border border-white/5 shadow-inner">
              <MessageSquare size={40} />
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-relaxed">Awaiting context. <br/> Select a folder to join.</p>
          </div>
        ) : (
          <div className="py-6 px-4">
            {groupedMessages.map((group, gIdx) => (
              <div 
                key={gIdx} 
                className="group/group relative py-3 px-4 hover:bg-white/[0.03] rounded-2xl transition-all mb-4 border border-transparent hover:border-white/[0.02]"
              >
                <div className="flex gap-4">
                  {/* Avatar Section */}
                  <div className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-[11px] font-black text-white shadow-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 overflow-hidden relative">
                    <div className={`absolute inset-0 opacity-80 ${getUserColor(group.senderName)}`} />
                    <span className="relative z-10 drop-shadow-md">{group.senderName.substring(0, 2).toUpperCase()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-[12px] font-black text-text-primary uppercase tracking-widest leading-none hover:text-emerald-400 transition-colors cursor-pointer">
                        {group.senderName} 
                      </span>
                      <span className="text-[9px] font-bold text-text-muted uppercase opacity-40 tracking-wider">
                        {group.timeRange}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {group.messages.map((msg: any) => (
                        <div key={msg._id} className="relative group/msg flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            {msg.content && (
                              <p className="text-[14px] font-medium text-text-secondary leading-relaxed break-words py-1 group-hover/msg:text-text-primary transition-colors">
                                {msg.content}
                              </p>
                            )}
                            
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-col gap-2 pt-2 pb-1">
                                {msg.attachments.map((file: any) => (
                                  <div 
                                    key={file.fileId}
                                    className="group/file flex items-center gap-3 p-3 rounded-xl bg-surface-active/50 border border-border-default hover:border-accent-emerald/30 hover:bg-accent-emerald/10 transition-all cursor-pointer max-w-sm"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center shrink-0 border border-border-default">
                                      {getFileIcon(file.mimeType)}
                                    </div>
                                    <div className="flex-1 min-w-0 text-[11px] font-black uppercase tracking-tighter">
                                      <p className="text-text-primary truncate">{file.fileName}</p>
                                      <p className="text-accent-emerald/70 font-bold tracking-normal text-[9px]">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Actions (On Hover) */}
                          <div className="absolute right-0 top-0 -translate-y-3 opacity-0 group-hover/msg:opacity-100 transition-all flex items-center gap-0.5 bg-surface-secondary/90 backdrop-blur-xl border border-border-default rounded-xl p-1 shadow-2xl z-20 scale-95 group-hover/msg:scale-100 origin-bottom-right">
                             <button className="p-1.5 hover:bg-accent-emerald/20 hover:text-accent-emerald rounded-lg text-text-muted transition-all"><Smile size={14} /></button>
                             <button className="p-1.5 hover:bg-accent-blue/20 hover:text-accent-blue rounded-lg text-text-muted transition-all"><Reply size={14} /></button>
                             {(user as any)?._id === group.senderId && (
                                <button className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-text-muted transition-all"><Trash2 size={13} /></button>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      <div className="p-5 bg-surface-secondary/40 backdrop-blur-3xl border-t border-border-default space-y-3 relative z-30">
        <AnimatePresence>
          {selectedAttachments.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 pb-2"
            >
              {selectedAttachments.map(f => (
                <div key={f._id} className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald text-[10px] font-black uppercase tracking-[0.1em] backdrop-blur-md">
                  <span className="truncate max-w-[120px]">{f.fileName}</span>
                  <button onClick={() => toggleAttachment(f)} className="hover:text-accent-rose transition-colors p-0.5 bg-surface-primary/20 rounded-full">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="relative flex flex-col gap-2">
          <div className="relative group/input flex items-center bg-surface-primary/40 border border-border-default rounded-2xl focus-within:border-accent-emerald/40 focus-within:bg-surface-primary/60 transition-all">
            <button 
              type="button"
              onClick={() => {
                loadFolderFiles();
                setShowPicker(!showPicker);
              }}
              className={`ml-1.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-10 ${showPicker ? 'bg-accent-emerald text-white' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/20'}`}
            >
              <Plus size={20} />
            </button>
            <input 
              type="text"
              className="w-full bg-transparent pl-3 pr-14 py-4 text-[14px] font-medium text-text-primary outline-none placeholder:text-text-muted/40 placeholder:uppercase placeholder:text-[10px] placeholder:font-black placeholder:tracking-[0.2em]"
              placeholder="Send a broadcast..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
              type="submit"
              disabled={sending || (!newMessage.trim() && selectedAttachments.length === 0)}
              className="absolute right-1.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-10 text-accent-emerald hover:bg-accent-emerald/20 disabled:opacity-20 disabled:hover:bg-transparent"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={20} className="-mr-1" />}
            </button>
          </div>

          <AnimatePresence>
            {showPicker && (
              <motion.div 
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-full left-0 right-0 mb-4 p-5 bg-surface-secondary/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[70] max-h-80 flex flex-col origin-bottom"
              >
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                   <h4 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">Context Inventory</h4>
                   <button onClick={() => setShowPicker(false)} className="bg-white/5 p-1 rounded-full"><X size={14} className="text-text-muted hover:text-text-primary" /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar-minimal pr-1">
                  {folderFiles.length === 0 ? (
                    <div className="flex flex-col items-center py-10 opacity-30 gap-3">
                       <FileArchive size={32} />
                       <p className="text-[10px] text-center font-black uppercase tracking-widest">No local context found</p>
                    </div>
                  ) : (
                    folderFiles.map(file => {
                      const isSelected = selectedAttachments.find(f => f._id === file._id);
                      return (
                        <button 
                          type="button"
                          key={file._id}
                          onClick={() => toggleAttachment(file)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shadow-inner ${isSelected ? 'bg-emerald-500 text-white' : 'bg-white/5'}`}>
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div className="text-left font-black uppercase tracking-tighter">
                              <p className={`text-[12px] truncate max-w-[180px] ${isSelected ? 'text-emerald-400' : 'text-text-primary'}`}>{file.fileName}</p>
                              <p className={`text-[10px] tracking-normal font-bold ${isSelected ? 'text-emerald-500/60' : 'text-text-muted/50'}`}>{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={18} className="text-emerald-400" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-minimal::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-minimal::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-minimal::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}} />
    </motion.div>
  );
}
