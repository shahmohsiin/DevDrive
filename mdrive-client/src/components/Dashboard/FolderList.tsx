import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import { Folder, Pencil, Users as UsersIcon, Trash2 } from "lucide-react";
import type { DashboardFolderItem } from "./types";

interface FolderListProps {
  folders: DashboardFolderItem[];
  isFolderEditor: boolean;
  isAdmin: boolean;
  selectFolder: (folder: DashboardFolderItem) => void;
  setShowRename: (rename: { id: string, name: string, type: 'folder' }) => void;
  setRenameValue: (val: string) => void;
  setShowManageAccess: (access: { id: string; name: string; permissions: any[] }) => void;
  handleDeleteFolder: (id: string) => void;
  setContextMenu: (menu: any) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export const FolderList = memo(({
  folders,
  isFolderEditor,
  isAdmin,
  selectFolder,
  setShowRename,
  setRenameValue,
  setShowManageAccess,
  handleDeleteFolder,
  setContextMenu
}: FolderListProps) => {
  if (folders.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] px-1">Sub-Folders</h3>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        layout
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5"
      >
        {folders.map(f => (
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            key={f._id} onClick={() => selectFolder(f)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, item: f, type: 'folder' });
            }}
            className="group relative bg-surface-secondary rounded-[32px] p-6 border border-border-default hover:border-blue-500/30 cursor-pointer shadow-sm hover:shadow-xl transition-colors duration-200"
          >
             <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                {isFolderEditor && (
                  <button onClick={(e) => { e.stopPropagation(); setShowRename({ id: f._id, name: f.name, type: 'folder' }); setRenameValue(f.name); }} className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary"><Pencil size={12} /></button>
                )}
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowManageAccess({ id: f._id, name: f.name, permissions: f.permissions }); }} 
                    className="p-1.5 rounded-md hover:bg-blue-500/20 text-blue-400"
                    title="Manage Access"
                  >
                    <UsersIcon size={12} />
                  </button>
                )}
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f._id); }} className="p-1.5 rounded-md hover:bg-rose-500/20 text-rose-400"><Trash2 size={12} /></button>
                )}
              </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4"><Folder size={24} /></div>
            <h3 className="text-sm font-semibold text-text-primary truncate">{f.name}</h3>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});
