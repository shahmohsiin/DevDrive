import { useState, useEffect, useRef, useCallback } from "react";
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
  getFolderFiles,
  deleteFolderMessage
} from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";

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
  replyTo?: string;
  replyToContent?: string;
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [folderFiles, setFolderFiles] = useState<FileItem[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<FileItem[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const { notify, checkMentions } = useNotifications();

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "✅", "🚀", "💡", "💯"];

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
      if (res.success && res.data) {
        // Map backend fields to the ChatMessage interface
        const rawMessages = res.data as any[];
        const newMessages: ChatMessage[] = rawMessages.map(m => ({
          _id: m._id,
          senderId: m.userId || m.senderId,
          senderName: m.userName || m.senderName || 'Unknown',
          senderEmail: m.userEmail || m.senderEmail || '',
          content: m.content,
          attachments: m.attachments,
          replyTo: m.replyTo,
          replyToContent: m.replyToContent,
          createdAt: m.createdAt
        }));
        
        // Notification Logic
        if (lastMsgIdRef.current && newMessages.length > 0) {
          const latest = newMessages[newMessages.length - 1];
          if (latest._id !== lastMsgIdRef.current && latest.senderId !== (user as any)?._id) {
            const isMentioned = checkMentions(latest.content, user?.email || '', user?.displayName || '');
            const isWindowBlurred = !document.hasFocus();

            if (isMentioned || isWindowBlurred) {
              notify(
                isMentioned ? `Mentioned by ${latest.senderName}` : `New message from ${latest.senderName}`,
                latest.content,
                { icon: 'message' }
              );
            }
          }
        }

        if (newMessages.length > 0) {
          lastMsgIdRef.current = newMessages[newMessages.length - 1]._id;
        }
        setMessages(newMessages);
      }
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
      const res = await sendFolderMessage(
        folderId, 
        newMessage.trim(), 
        attachments, 
        replyingTo?._id, 
        replyingTo?.content
      );
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data as any]);
        setNewMessage("");
        setSelectedAttachments([]);
        setReplyingTo(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!folderId || !confirm("Delete this message?")) return;
    try {
      const res = await deleteFolderMessage(folderId, messageId);
      if (res.success) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const toggleAttachment = (file: FileItem) => {
    setSelectedAttachments(prev => 
      prev.find(f => f._id === file._id) ? prev.filter(f => f._id !== file._id) : [...prev, file]
    );
  };

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
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-text-primary">Chat</h3>
            <div className="flex items-center gap-1.5 opacity-60">
               <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
               <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.1em]">Online</p>
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
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] leading-relaxed">Select a folder to start chatting</p>
          </div>
        ) : (
          <div className="py-8 px-5 space-y-8">
            {messages.map((msg, idx) => {
              const isMe = (user as any)?._id === msg.senderId;
              const prevMsg = messages[idx - 1];
              const isSameUser = prevMsg?.senderId === msg.senderId;
              
              return (
                <motion.div 
                  key={msg._id} 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative`}
                >
                  {!isMe && !isSameUser && (
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3 mb-1.5 opacity-60">
                      {msg.senderName}
                    </span>
                  )}

                  <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Minimal Avatar */}
                    {!isSameUser && (
                      <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-black text-white shadow-lg border border-white/10 overflow-hidden relative ${isMe ? 'order-last' : ''}`}>
                        <div className={`absolute inset-0 opacity-80 ${getUserColor(msg.senderName)}`} />
                        <span className="relative z-10">{msg.senderName[0].toUpperCase()}</span>
                      </div>
                    )}
                    {isSameUser && <div className="w-6 shrink-0" />}

                    <div className="flex flex-col gap-1 relative">
                       {/* Reply Context */}
                       {msg.replyToContent && (
                          <div className={`px-3 py-1.5 rounded-t-xl bg-white/5 border-l-2 border-accent-blue text-[11px] text-text-muted truncate max-w-xs mb-[-4px] opacity-70`}>
                             {msg.replyToContent}
                          </div>
                       )}

                       {/* Message Bubble */}
                       <div className={`relative px-4 py-2.5 shadow-xl transition-all ${
                         isMe 
                           ? `bg-accent-blue text-white rounded-2xl rounded-tr-none` 
                           : `${msg.replyToContent ? 'rounded-b-2xl rounded-tr-2xl' : 'rounded-2xl rounded-tl-none'} bg-surface-card border border-border-default text-text-primary`
                       }`}>
                          {msg.content && <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                          
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map(file => (
                                <div key={file.fileId} className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-white/10' : 'bg-surface-secondary'} border border-white/5`}>
                                   {getFileIcon(file.mimeType)}
                                   <span className="text-[10px] font-bold truncate max-w-[120px]">{file.fileName}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <span className={`text-[8px] font-bold opacity-40 mt-1 block tracking-wider ${isMe ? 'text-right' : 'text-left'}`}>
                            {formatDate(msg.createdAt)}
                          </span>
                       </div>

                       {/* Bubble Actions Popup (Minimal) */}
                       <div className={`absolute top-0 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover/msg:opacity-100 transition-all flex items-center gap-1 z-30`}>
                          <button 
                            onClick={() => setReplyingTo(msg)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-text-muted hover:text-text-primary transition-all shadow-sm border border-transparent hover:border-white/10"
                            title="Reply"
                          >
                            <Reply size={12} />
                          </button>
                          {isMe && (
                            <button 
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="p-1.5 hover:bg-rose-500/20 rounded-lg text-text-muted hover:text-rose-400 transition-all shadow-sm border border-transparent hover:border-white/10"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                       </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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

        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-between px-4 py-2 bg-white/5 border-l-4 border-accent-blue mb-2 rounded-r-xl"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Replying to {replyingTo.senderName}</p>
                <p className="text-[11px] text-text-muted truncate">{replyingTo.content}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="relative flex flex-col gap-2">
          <div className="relative group/input flex items-center bg-surface-primary/40 border border-border-default rounded-2xl focus-within:border-accent-blue/40 focus-within:bg-surface-primary/60 transition-all">
            <button 
              type="button"
              onClick={() => {
                loadFolderFiles();
                setShowPicker(!showPicker);
              }}
              className={`ml-1.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-10 ${showPicker ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/20'}`}
            >
              <Plus size={20} />
            </button>
            <input 
              type="text"
              className="w-full bg-transparent pl-3 pr-14 py-4 text-[14px] font-medium text-text-primary outline-none placeholder:text-text-muted/40 placeholder:uppercase placeholder:text-[10px] placeholder:font-black placeholder:tracking-[0.2em]"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            
            <div className="absolute right-12 flex items-center">
               <button 
                 type="button"
                 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                 className={`p-2 rounded-lg transition-all ${showEmojiPicker ? 'text-accent-amber bg-accent-amber/10' : 'text-text-muted hover:text-accent-amber hover:bg-accent-amber/5'}`}
               >
                 <Smile size={18} />
               </button>
            </div>

            <button 
              type="submit"
              disabled={sending || (!newMessage.trim() && selectedAttachments.length === 0)}
              className="absolute right-1.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-10 text-accent-blue hover:bg-accent-blue/20 disabled:opacity-20 disabled:hover:bg-transparent"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={20} className="-mr-1" />}
            </button>

            {/* Simple Inline Emoji Picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: -50 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 bottom-full bg-surface-card border border-border-default p-2 rounded-2xl shadow-2xl flex gap-1 z-50 backdrop-blur-xl"
                >
                  {emojis.map(e => (
                    <button 
                      key={e}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + e);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-lg transition-all transform hover:scale-125"
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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
