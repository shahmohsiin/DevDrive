import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, UserPlus, Shield, User, Trash2, Search, Loader2, Check } from "lucide-react";
import { getUsers, updateFolderPermissions } from "../lib/api";

interface UserItem {
  _id: string;
  email: string;
  displayName: string;
  role: string;
}

interface Permission {
  userId: string;
  access: "editor" | "viewer";
}

interface ManageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  currentPermissions: Permission[];
  onUpdate: () => void;
}

export function ManageAccessModal({ 
  isOpen, 
  onClose, 
  folderId, 
  folderName, 
  currentPermissions,
  onUpdate 
}: ManageAccessModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAccess, setSelectedAccess] = useState<"editor" | "viewer">("viewer");
  const [localPermissions, setLocalPermissions] = useState<Permission[]>(currentPermissions);

  useEffect(() => {
    if (isOpen) {
      setLocalPermissions(currentPermissions);
      fetchUsers();
    }
  }, [isOpen, currentPermissions]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await getUsers();
      if (res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddPermission = (userId: string) => {
    if (localPermissions.some(p => p.userId === userId)) return;
    setLocalPermissions([...localPermissions, { userId, access: selectedAccess }]);
  };

  const handleRemovePermission = (userId: string) => {
    setLocalPermissions(localPermissions.filter(p => p.userId !== userId));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateFolderPermissions(folderId, localPermissions);
      onUpdate();
      onClose();
    } catch (err) {
      alert("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email.toLowerCase().includes(search.toLowerCase()) || 
     u.displayName.toLowerCase().includes(search.toLowerCase())) &&
    !localPermissions.some(p => p.userId === u._id)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-primary/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-surface-secondary rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-border-default"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-surface-secondary/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Manage Access</h3>
                  <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">{folderName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Permissions */}
              <div>
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">People with access</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin rounded-lg">
                  {localPermissions.length === 0 ? (
                    <p className="text-xs text-text-muted italic py-2">No specific permissions assigned (Private)</p>
                  ) : (
                    localPermissions.map(p => {
                      const user = users.find(u => u._id === p.userId);
                      return (
                        <div key={p.userId} className="flex items-center justify-between p-3 rounded-xl bg-surface-primary border border-border-default hover:border-blue-500/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-text-primary">{user?.displayName || "Loading..."}</p>
                              <p className="text-[10px] text-text-muted">{user?.email || p.userId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${p.access === 'editor' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {p.access}
                             </span>
                             <button 
                               onClick={() => handleRemovePermission(p.userId)}
                               className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-500 transition-colors"
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add New */}
              <div className="space-y-3 pt-2 border-t border-border-default">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Share with others</h4>
                   <div className="flex bg-surface-hover p-0.5 rounded-lg border border-border-default">
                      <button 
                        onClick={() => setSelectedAccess("viewer")}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${selectedAccess === 'viewer' ? 'bg-blue-500 text-white shadow-sm' : 'text-text-muted'}`}
                      >
                        Viewer
                      </button>
                      <button 
                        onClick={() => setSelectedAccess("editor")}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${selectedAccess === 'editor' ? 'bg-emerald-500 text-white shadow-sm' : 'text-text-muted'}`}
                      >
                        Editor
                      </button>
                   </div>
                </div>
                
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search users by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-surface-primary border border-border-default rounded-xl py-2.5 pl-10 pr-4 text-xs text-text-primary focus:ring-1 focus:ring-blue-500/50 transition-all outline-none"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg">
                  {loading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
                  ) : filteredUsers.length === 0 ? (
                    search && <p className="text-[10px] text-text-muted text-center py-4 italic">No players found matching your query</p>
                  ) : (
                    filteredUsers.map(user => (
                      <button 
                        key={user._id}
                        onClick={() => handleAddPermission(user._id)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                           <div className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-text-muted group-hover:bg-blue-500/10 group-hover:text-blue-500">
                             <User size={12} />
                           </div>
                           <div>
                              <p className="text-xs font-medium text-text-primary">{user.displayName}</p>
                              <p className="text-[9px] text-text-muted">{user.email}</p>
                           </div>
                        </div>
                        <UserPlus size={14} className="text-text-muted group-hover:text-blue-500" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-surface-secondary/50 border-t border-border-default flex items-center justify-between">
              <span className="text-[10px] text-text-muted italic">Changes will apply immediately after saving.</span>
              <div className="flex gap-2">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-hover rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Permissions
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
