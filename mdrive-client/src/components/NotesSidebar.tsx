import { useState, useEffect, useCallback } from "react";
import { 
  X, 
  Loader2,
  Trash2,
  StickyNote,
  Send,
  Plus,
  ChevronLeft,
  Edit2,
  Save,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getFolderNotes, 
  createNote,
  updateNote,
  deleteNote
} from "../lib/api";

interface Note {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesSidebarProps {
  folderId: string | null;
  onClose: () => void;
}

export function NotesSidebar({ folderId, onClose }: NotesSidebarProps) {
  const [width, setWidth] = useState(parseInt(localStorage.getItem('notes-width') || '450'));
  const [isResizing, setIsResizing] = useState(false);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const calcWidth = e.clientX - 240; 
      if (calcWidth >= 300 && calcWidth <= 800) {
        setWidth(calcWidth);
        localStorage.setItem('notes-width', calcWidth.toString());
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
      fetchNotes();
    }
  }, [folderId]);

  async function fetchNotes() {
    if (!folderId) return;
    setLoading(true);
    try {
      const res = await getFolderNotes(folderId);
      if (res.success && Array.isArray(res.data)) {
        setNotes(res.data as Note[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newNoteContent.trim() || !folderId || submitting) return;
    
    setSubmitting(true);
    try {
      const res = await createNote(folderId, newNoteContent);
      if (res.success && res.data) {
        setNotes([res.data as unknown as Note, ...notes]);
        setNewNoteContent("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateNote() {
    if (!editingNoteId || !editingContent.trim()) return;
    try {
      const res = await updateNote(editingNoteId, editingContent);
      if (res.success && res.data) {
        setNotes(notes.map(n => n._id === editingNoteId ? res.data as unknown as Note : n));
        setEditingNoteId(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteNote(id: string) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await deleteNote(id);
      if (res.success) {
        setNotes(notes.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric' 
      }).format(new Date(dateString));
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }} 
      animate={{ width: width, opacity: 1 }} 
      exit={{ width: 0, opacity: 0 }} 
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="h-full border-r border-border-default bg-surface-secondary/80 flex flex-col shrink-0 relative overflow-hidden group/sidebar z-40"
      style={{ width }}
    >
      {/* Resizer Handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-[65]"
      />
      
      {/* Retract Handle */}
      <button 
        onClick={onClose}
        className="absolute -right-3 top-1/2 -translate-y-12 w-6 h-12 bg-surface-active border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-blue-500 opacity-0 group-hover/sidebar:opacity-100 transition-all z-[61]"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Header */}
      <div className="p-5 flex items-center justify-between sticky top-0 bg-surface-secondary/10 backdrop-blur-xl z-20 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
            <StickyNote size={18} />
          </div>
          <div>
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-text-primary">Workspace Notes</h3>
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.1em]">
              {loading ? "Fetching records..." : `${notes.length} Note${notes.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-text-muted transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Submit Section */}
      <div className="p-6 border-b border-white/[0.03] bg-white/[0.01]">
        <form onSubmit={handleAddNote} className="space-y-3">
          <div className="relative group">
            <textarea 
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Capture a new thought..."
              className="w-full bg-surface-primary/40 border border-border-default rounded-2xl p-4 pt-10 text-[14px] font-medium text-text-primary outline-none focus:border-accent-blue/30 focus:bg-surface-secondary/20 transition-all placeholder:text-text-muted/30 placeholder:uppercase placeholder:text-[10px] placeholder:font-black placeholder:tracking-[0.1em] resize-none min-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleAddNote();
                }
              }}
            />
            <div className="absolute top-3 left-4 flex items-center gap-2 text-[10px] font-black text-text-muted/40 uppercase tracking-widest">
              <Plus size={12} /> New Entry
            </div>
            <button 
              type="submit"
              disabled={submitting || !newNoteContent.trim()}
              className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-bold text-text-muted/40 uppercase tracking-[0.1em]">CMD + ENTER to submit</p>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-minimal pb-10">
        {!folderId ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-10 space-y-6 opacity-30 mt-20">
            <StickyNote size={40} className="text-text-muted" />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">No Context Available</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-50">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Accessing Vault...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-10">
            <div className="w-16 h-16 rounded-3xl bg-surface-hover flex items-center justify-center text-text-muted/20 border border-white/5 mb-6">
              <Plus size={24} />
            </div>
            <h4 className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Workspace Empty</h4>
            <p className="text-[10px] font-medium text-text-muted/40 tracking-wide">Submit your first note to begin documentation.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {notes.map((note, index) => {
                const colors = [
                  'border-blue-500/50 text-blue-400',
                  'border-emerald-500/50 text-emerald-400',
                  'border-amber-500/50 text-amber-400',
                  'border-rose-500/50 text-rose-400',
                  'border-violet-500/50 text-violet-400',
                  'border-cyan-500/50 text-cyan-400'
                ];
                const colorClass = colors[index % colors.length];
                const borderColor = colorClass.split(' ')[0];
                const textColor = colorClass.split(' ')[1];

                return (
                  <motion.div 
                    key={note._id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group/note relative p-6 border-b border-white/5 transition-colors hover:bg-white/[0.02]`}
                  >
                    {/* Color Accent Indicator */}
                    <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full border-r-2 ${borderColor} opacity-40 group-hover/note:opacity-100 transition-opacity`} />

                    <div className="flex items-center justify-between mb-3 pl-2">
                      <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${textColor} opacity-60`}>
                        <Clock size={10} />
                        {formatDate(note.createdAt)}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingNoteId(note._id);
                            setEditingContent(note.content);
                          }}
                          className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-blue-400 transition-all"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteNote(note._id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-text-muted hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {editingNoteId === note._id ? (
                      <div className="space-y-3 pl-2">
                        <textarea 
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full bg-black/20 border border-accent-blue/30 rounded-xl p-3 text-[13px] font-medium text-text-primary outline-none focus:bg-black/30 transition-all resize-none min-h-[100px]"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleUpdateNote}
                            className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
                          >
                            <Save size={12} /> Sync Update
                          </button>
                          <button 
                            onClick={() => setEditingNoteId(null)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-white/5 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="pl-2 text-[13px] font-medium text-text-secondary leading-relaxed whitespace-pre-wrap break-words tracking-wide group-hover/note:text-text-primary transition-colors">
                        {note.content}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-minimal::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-minimal::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-minimal::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}} />
    </motion.div>
  );
}
