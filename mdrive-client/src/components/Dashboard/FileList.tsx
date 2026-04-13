import { motion } from "framer-motion";
import { HardDrive, Loader2, Eye, Download, Pencil, X } from "lucide-react";
import { FileIcon } from "../FileIcon";

interface FileItem {
  _id: string;
  folderId: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface FileListProps {
  files: FileItem[];
  filesLoading: boolean;
  viewMode: 'grid' | 'list';
  isFolderEditor: boolean;
  handleView: (file: FileItem) => void;
  handleDownload: (file: FileItem) => void;
  handleDeleteFile: (id: string) => void;
  setShowRename: (rename: { id: string, name: string, type: 'file' }) => void;
  setRenameValue: (val: string) => void;
  setContextMenu: (menu: any) => void;
  formatSize: (bytes: number) => string;
}

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
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-default rounded-2xl bg-white/5">
        <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center text-text-muted mb-4">
          <HardDrive size={24} />
        </div>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">No objects in this layer</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-surface-secondary rounded-2xl border border-border-default overflow-hidden">
        <table className="w-full text-left text-xs text-text-secondary">
          <thead className="bg-black/5">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Size</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {files.map(file => (
              <tr 
                key={file._id} 
                className="group hover:bg-white/5" 
                onContextMenu={(e) => { 
                  e.preventDefault(); 
                  setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); 
                }}
              >
                <td className="px-6 py-4 flex items-center gap-3">
                  <FileIcon fileName={file.fileName} className="text-blue-400" />
                  {file.fileName}
                </td>
                <td className="px-6 py-4">{formatSize(file.size)}</td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleView(file)} className="p-2 text-blue-400"><Eye size={14} /></button>
                      <button onClick={() => handleDownload(file)} className="p-2 text-emerald-400"><Download size={14} /></button>
                      {isFolderEditor && <button onClick={() => handleDeleteFile(file._id)} className="p-2 text-rose-500"><X size={16} /></button>}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {files.map(file => (
        <motion.div
          layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          key={file._id} 
          onContextMenu={(e) => { 
            e.preventDefault(); 
            setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); 
          }}
          className="group relative bg-surface-secondary rounded-[32px] p-6 border border-border-default hover:border-blue-500/30 transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-1"
        >
          <div className="flex justify-between mb-4">
            <FileIcon fileName={file.fileName} size={24} className="text-blue-400" />
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <button onClick={() => handleView(file)} className="p-1 hover:text-blue-400" title="View"><Eye size={14} /></button>
              <button onClick={() => handleDownload(file)} className="p-1 hover:text-emerald-400" title="Download"><Download size={14} /></button>
              {isFolderEditor && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowRename({ id: file._id, name: file.fileName, type: 'file' }); setRenameValue(file.fileName); }} 
                  className="p-1 hover:text-blue-400"
                  title="Rename"
                >
                  <Pencil size={12} />
                </button>
              )}
              {isFolderEditor && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(file._id); }} 
                  className="p-1 hover:text-rose-500"
                  title="Delete"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <h4 className="text-sm font-semibold text-text-primary truncate">{file.fileName}</h4>
          <span className="text-[10px] text-text-muted">{formatSize(file.size)}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
