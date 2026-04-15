import { motion, type Variants } from "framer-motion";
import { HardDrive, Loader2, Eye, Download, Pencil, X } from "lucide-react";
import { FileIcon } from "../FileIcon";
import type { DashboardFileItem } from "./types";

interface FileListProps {
  files: DashboardFileItem[];
  filesLoading: boolean;
  viewMode: 'grid' | 'list';
  isFolderEditor: boolean;
  handleView: (file: DashboardFileItem) => void | Promise<void>;
  handleDownload: (file: DashboardFileItem) => void | Promise<void>;
  handleDeleteFile: (id: string) => void;
  setShowRename: (rename: { id: string, name: string, type: 'file' }) => void;
  setRenameValue: (val: string) => void;
  setContextMenu: (menu: any) => void;
  formatSize: (bytes: number) => string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 }
  }
};

export function FileList({
  files,
  filesLoading,
  viewMode,
  isFolderEditor,
  handleView,
  handleDownload,
  handleDeleteFile,
  setShowRename,
  setRenameValue,
  setContextMenu,
  formatSize
}: FileListProps) {
  if (filesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500/50 animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 border border-dashed border-border-default rounded-[32px] bg-surface-secondary/30"
      >
        <div className="w-12 h-12 rounded-2xl bg-surface-secondary flex items-center justify-center text-text-muted mb-4 border border-border-default">
          <HardDrive size={24} />
        </div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">No objects in this layer</p>
      </motion.div>
    );
  }

  if (viewMode === 'list') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-surface-secondary rounded-[32px] border border-border-default overflow-hidden shadow-sm"
      >
        <table className="w-full text-left text-[11px] text-text-secondary border-collapse">
          <thead>
            <tr className="border-b border-border-default bg-surface-active/10">
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-text-muted">Name</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-text-muted">Size</th>
              <th className="px-6 py-4 text-right font-bold uppercase tracking-widest text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/50">
            {files.map(file => (
              <tr 
                key={file._id} 
                className="group hover:bg-surface-active/20 transition-colors duration-150 cursor-pointer" 
                onClick={() => handleView(file)}
                onContextMenu={(e) => { 
                  e.preventDefault(); 
                  setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); 
                }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileIcon fileName={file.fileName} className="text-blue-400" />
                    <span className="font-medium text-text-primary">{file.fileName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-text-muted">{formatSize(file.size)}</td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleView(file); }} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"><Eye size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"><Download size={14} /></button>
                      {isFolderEditor && <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file._id); }} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"><X size={16} /></button>}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      layout 
      className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5"
    >
      {files.map(file => (
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          key={file._id} 
          onClick={() => handleView(file)}
          onContextMenu={(e) => { 
            e.preventDefault(); 
            setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); 
          }}
          className="group relative bg-surface-secondary rounded-[32px] p-6 border border-border-default hover:border-blue-500/30 cursor-pointer shadow-sm hover:shadow-xl transition-colors duration-200"
        >
          <div className="flex justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
              <FileIcon fileName={file.fileName} size={20} />
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); handleView(file); }} className="p-1.5 hover:text-blue-400 hover:bg-white/10 rounded-md transition-colors" title="View"><Eye size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-1.5 hover:text-emerald-400 hover:bg-white/10 rounded-md transition-colors" title="Download"><Download size={14} /></button>
              {isFolderEditor && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowRename({ id: file._id, name: file.fileName, type: 'file' }); setRenameValue(file.fileName); }} 
                  className="p-1.5 hover:text-blue-400 hover:bg-white/10 rounded-md transition-colors"
                  title="Rename"
                >
                  <Pencil size={12} />
                </button>
              )}
              {isFolderEditor && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(file._id); }} 
                  className="p-1.5 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                  title="Delete"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <h4 className="text-sm font-semibold text-text-primary truncate mb-1">{file.fileName}</h4>
          <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-tighter opacity-60">{formatSize(file.size)}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
