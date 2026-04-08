import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderPlus, 
  Upload, 
  Search, 
  History, 
  ChevronLeft, 
  Pencil, 
  Trash2, 
  Download, 
  Eye, 
  X,
  LayoutGrid,
  List as ListIcon,
  HardDrive,
  Users as UsersIcon,
  Folder,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Home,
  Copy,
  Move,
  MessageSquare,
  StickyNote
} from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import {
  getFolders,
  createFolder,
  deleteFolder,
  getFolderFiles,
  getUploadUrl,
  confirmUpload,
  getDownloadUrl,
  deleteFile,
  renameFile,
  updateFolder,
  getFolderActivity,
  moveFile,
  copyFile,
  moveFolder
} from "../lib/api";
import {
  uploadFile,
  hashFile,
  getFileSize,
  downloadFile,
  cancelUpload,
} from "../lib/tauri";
import { useAuth } from "../hooks/useAuth";
import { HistorySidebar } from "../components/HistorySidebar";
import { CommunitySidebar } from "../components/CommunitySidebar";
import { NotesSidebar } from "../components/NotesSidebar";
import { FileIcon } from "../components/FileIcon";
import { FilePreviewModal } from "../components/FilePreviewModal";
import { ManageAccessModal } from "../components/ManageAccessModal";
import { DeleteConfirmationModal } from "../components/DeleteConfirmationModal";

interface FolderItem {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  parentId?: string;
  permissions: Array<{ userId: string; access: string }>;
  createdAt: string;
  updatedAt: string;
}

interface FileItem {
  _id: string;
  folderId: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  currentVersion: number;
  size: number;
  updatedAt: string;
}

interface TransferState {
  id: string;
  fileName: string;
  type: 'upload' | 'download';
  status: 'pending' | 'progress' | 'completed' | 'error' | 'cancelled';
  percentage: number;
  bytesTransferred: number;
  totalBytes: number;
}

export function DashboardPage() {
  const { user } = useAuth();

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const selectedFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [transfers, setTransfers] = useState<Record<string, TransferState>>({});
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showRename, setShowRename] = useState<{ id: string, name: string, type: 'file' | 'folder' } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [showHistory, setShowHistory] = useState(false);
  
  // Derive sidebar visibility from URL
  const showCommunity = searchParams.get('sidebar') === 'community';
  const showNotes = searchParams.get('sidebar') === 'notes';

  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const authActiveRef = useRef(!!user);
  const cancelledUploadsRef = useRef<Set<string>>(new Set());
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any, type: 'file' | 'folder' } | null>(null);
  const [showPicker, setShowPicker] = useState<{ type: 'move' | 'copy', item: any, itemType: 'file' | 'folder' } | null>(null);
  const [pickerDestId, setPickerDestId] = useState<string | null>(null);
  const [pickerFolders, setPickerFolders] = useState<FolderItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const isGlobalEditor = user?.role === "admin" || user?.role === "editor";
  
  const isFolderEditor = selectedFolder 
    ? isAdmin || selectedFolder.permissions?.some(p => p.userId === (user as any)?._id && (p.access === 'editor' || p.access === 'admin'))
    : isAdmin || isGlobalEditor;

  const [previewFile, setPreviewFile] = useState<{ 
    _id: string, 
    fileName: string, 
    mimeType: string, 
    downloadUrl: string, 
    size: number,
    folderId: string,
    relativePath: string
  } | null>(null);

  const [showManageAccess, setShowManageAccess] = useState<{ id: string; name: string; permissions: any[] } | null>(null);

  function setTransferState(
    transferId: string,
    updater: (current?: TransferState) => TransferState | null
  ) {
    if (!mountedRef.current) return;
    setTransfers((prev) => {
      const nextValue = updater(prev[transferId]);
      if (!nextValue) {
        const next = { ...prev };
        delete next[transferId];
        return next;
      }
      return {
        ...prev,
        [transferId]: nextValue,
      };
    });
  }

  const navigateToBreadcrumb = (index: number) => {
    setFolderPath(prev => prev.slice(0, index + 1));
  };

  function scheduleTransferCleanup(transferId: string, delayMs = 500) {
    window.setTimeout(() => {
      setTransferState(transferId, () => null);
    }, delayMs);
  }

  function isUploadInterrupted(transferId: string) {
    return !authActiveRef.current || cancelledUploadsRef.current.has(transferId);
  }

  useEffect(() => {
    authActiveRef.current = !!user;
  }, [user]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string, type: 'file' | 'folder' } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let unlistenUpload: any;
    let unlistenDownload: any;

    const setupListeners = async () => {
      unlistenUpload = await listen("upload-progress", (event: any) => {
        const payload = event.payload as any;
        setTransferState(payload.id, (current) => {
          if (!current) return null;
          return {
            ...current,
            status: "progress",
            percentage: payload.percentage,
            bytesTransferred: payload.bytes_sent,
            totalBytes: payload.total_bytes,
          };
        });
      });

      unlistenDownload = await listen("download-progress", (event: any) => {
        const payload = event.payload as any;
        setTransferState(payload.id, (current) => {
          if (!current) return null;
          return {
            ...current,
            status: "progress",
            percentage: payload.percentage,
            bytesTransferred: payload.bytes_sent,
            totalBytes: payload.total_bytes,
          };
        });
      });
    };

    setupListeners();
    return () => {
      if (unlistenUpload) unlistenUpload();
      if (unlistenDownload) unlistenDownload();
    };
  }, []);

  useEffect(() => {
    if (user) return;

    const activeUploadIds = Object.values(transfers)
      .filter((transfer) => transfer.type === "upload" && (transfer.status === "pending" || transfer.status === "progress"))
      .map((transfer) => transfer.id);

    if (activeUploadIds.length === 0) return;

    activeUploadIds.forEach((transferId) => {
      cancelledUploadsRef.current.add(transferId);
      setTransferState(transferId, (current) =>
        current
          ? {
              ...current,
              status: "cancelled",
            }
          : null
      );
      scheduleTransferCleanup(transferId, 2000);
    });
  }, [transfers, user]);

  const loadFolders = useCallback(async (parentId: string | null = null) => {
    try {
      setLoading(true);
      setError("");
      const res = await getFolders(parentId);
      const nextFolders = res.data ?? [];
      if (mountedRef.current) {
        setFolders(nextFolders);
      }
      return nextFolders;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load folders");
      }
      return [];
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadFiles = useCallback(async (folderId: string) => {
    try {
      setFilesLoading(true);
      const res = await getFolderFiles(folderId);
      if (res.data && mountedRef.current) setFiles(res.data);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      }
    } finally {
      if (mountedRef.current) {
        setFilesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFolders(selectedFolder?._id || null);
    if (selectedFolder) {
      loadFiles(selectedFolder._id);
    } else {
      setFiles([]);
    }
  }, [loadFolders, loadFiles, selectedFolder?._id]);

  function selectFolder(folder: FolderItem) {
    setFolderPath(prev => [...prev, folder]);
  }

  function goBack() {
    setFolderPath(prev => prev.slice(0, -1));
  }

  function goToRoot() {
    setFolderPath([]);
  }

  const handleRefreshAll = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (selectedFolder) {
        await Promise.all([
          loadFiles(selectedFolder._id),
          loadFolders(selectedFolder._id)
        ]);
      } else {
        await loadFolders(null);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedFolder, loadFiles, loadFolders, refreshing]);

  async function handleCancelUpload(transferId: string) {
    cancelledUploadsRef.current.add(transferId);
    setTransferState(transferId, (current) =>
      current
        ? {
            ...current,
            status: "cancelled",
          }
        : null
    );
    scheduleTransferCleanup(transferId, 2000);

    try {
      await cancelUpload(transferId);
    } catch (err) {
      console.error("Failed to cancel upload:", err);
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createFolder(newFolderName, newFolderDesc, selectedFolder?._id);
      setShowNewFolder(false);
      setNewFolderName("");
      setNewFolderDesc("");
      await loadFolders(selectedFolder?._id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!showRename) return;
    try {
      if (showRename.type === 'file') {
        await renameFile(showRename.id, renameValue);
        if (selectedFolder) await loadFiles(selectedFolder._id);
      } else {
        await updateFolder(showRename.id, { name: renameValue });
        await loadFolders();
      }
      setShowRename(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    }
  }

  async function handleUpload() {
    if (!selectedFolder) return;

    try {
      const filePaths = await openDialog({
        multiple: true,
        title: "Select files to upload",
      });

      if (!filePaths || (Array.isArray(filePaths) && filePaths.length === 0))
        return;

      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      const activeFolderId = selectedFolder._id;

      for (const filePath of paths) {
        if (!authActiveRef.current) break;

        const fileName = filePath.split(/[/\\]/).pop() || "unknown";

        const sha256 = await hashFile(filePath);
        const size = await getFileSize(filePath);

        const transferId = sha256;
        setTransferState(transferId, () => ({
          id: transferId,
          fileName,
          type: "upload",
          status: "pending",
          percentage: 0,
          bytesTransferred: 0,
          totalBytes: size,
        }));

        if (isUploadInterrupted(transferId)) {
          setTransferState(transferId, (current) =>
            current
              ? {
                  ...current,
                  status: "cancelled",
                }
              : null
          );
          scheduleTransferCleanup(transferId, 2000);
          cancelledUploadsRef.current.delete(transferId);
          if (!authActiveRef.current) break;
          continue;
        }

        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const mimeMap: Record<string, string> = {
          txt: "text/plain", md: "text/plain", html: "text/html",
          css: "text/css", js: "application/javascript", ts: "application/typescript",
          tsx: "application/typescript", json: "application/json", png: "image/png",
          jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
          svg: "image/svg+xml", pdf: "application/pdf", zip: "application/zip",
        };
        const mimeType = mimeMap[ext] || "application/octet-stream";

        try {
          const urlRes = await getUploadUrl({
            folderId: activeFolderId,
            relativePath: fileName,
            fileName,
            mimeType,
            size,
            sha256,
          });

          if (!urlRes.data) throw new Error("Failed to get upload URL");

          if (isUploadInterrupted(transferId)) {
            setTransferState(transferId, (current) =>
              current
                ? {
                    ...current,
                    status: "cancelled",
                  }
                : null
            );
            scheduleTransferCleanup(transferId, 2000);
            cancelledUploadsRef.current.delete(transferId);
            if (!authActiveRef.current) break;
            continue;
          }

          await uploadFile(filePath, urlRes.data.uploadUrl, mimeType, transferId);

          if (isUploadInterrupted(transferId)) {
            setTransferState(transferId, (current) =>
              current
                ? {
                    ...current,
                    status: "cancelled",
                  }
                : null
            );
            scheduleTransferCleanup(transferId, 2000);
            cancelledUploadsRef.current.delete(transferId);
            if (!authActiveRef.current) break;
            continue;
          }

          await confirmUpload({
            fileId: urlRes.data.fileId,
            b2Key: urlRes.data.b2Key,
            sha256,
            size,
          });

          setTransferState(transferId, (current) =>
            current
              ? {
                  ...current,
                  status: "completed",
                  percentage: 100,
                  bytesTransferred: size,
                }
              : null
          );
          scheduleTransferCleanup(transferId);

        } catch (err) {
          const wasCancelled =
            isUploadInterrupted(transferId) ||
            (err instanceof Error && err.message.toLowerCase().includes("cancel"));

          if (wasCancelled) {
            setTransferState(transferId, (current) =>
              current
                ? {
                    ...current,
                    status: "cancelled",
                  }
                : null
            );
            scheduleTransferCleanup(transferId, 2000);
            cancelledUploadsRef.current.delete(transferId);
            if (!authActiveRef.current) break;
            continue;
          }

          setTransferState(transferId, (current) =>
            current
              ? {
                  ...current,
                  status: "error",
                }
              : null
          );
          setError(err instanceof Error ? err.message : `Upload failed for ${fileName}`);
        }

        cancelledUploadsRef.current.delete(transferId);
      }

      if (authActiveRef.current && mountedRef.current && selectedFolder?._id === activeFolderId) {
        await loadFiles(activeFolderId);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Upload selection failed");
      }
    }
  }

  async function handleDownload(file: FileItem) {
    try {
      const savePath = await openDialog({
        directory: true,
        title: "Select download location",
      });

      if (!savePath || typeof savePath !== "string") return;

      const fullPath = `${savePath}/${file.fileName}`;
      
      setTransferState(fullPath, () => ({
        id: fullPath,
        fileName: file.fileName,
        type: 'download',
        status: 'pending',
        percentage: 0,
        bytesTransferred: 0,
        totalBytes: file.size
      }));

      const urlRes = await getDownloadUrl(file._id);
      if (!urlRes.data) throw new Error("Failed to get download URL");

      await downloadFile(urlRes.data.downloadUrl, fullPath);

      setTransferState(fullPath, (current) =>
        current
          ? {
              ...current,
              status: "completed",
              percentage: 100,
              bytesTransferred: file.size,
            }
          : null
      );

      scheduleTransferCleanup(fullPath);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    }
  }

  async function handleView(file: FileItem) {
    try {
      const urlRes = await getDownloadUrl(file._id);
      if (!urlRes.data) throw new Error("Failed to open preview");
      
      setPreviewFile({
        _id: file._id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        downloadUrl: urlRes.data.downloadUrl,
        size: file.size,
        folderId: file.folderId,
        relativePath: file.relativePath
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open preview");
    }
  }

  async function handleDeleteFile(fileId: string) {
    const file = files.find(f => f._id === fileId);
    if (file) {
      setShowDeleteConfirm({ id: file._id, name: file.fileName, type: 'file' });
    }
  }

  async function handleDeleteFolder(id: string) {
    const folder = folders.find(f => f._id === id);
    if (folder) {
      setShowDeleteConfirm({ id: folder._id, name: folder.name, type: 'folder' });
    }
  }

  async function confirmDelete() {
    if (!showDeleteConfirm) return;
    
    try {
      setDeleteLoading(true);
      if (showDeleteConfirm.type === 'file') {
        const res = await deleteFile(showDeleteConfirm.id);
        if (res.success) {
          if (selectedFolder) await loadFiles(selectedFolder._id);
          setShowDeleteConfirm(null);
        } else {
          setError(res.error || "Failed to delete file");
        }
      } else {
        await deleteFolder(showDeleteConfirm.id);
        if (selectedFolder?._id === showDeleteConfirm.id) {
          goBack();
        }
        await loadFolders(selectedFolder?._id || null);
        setShowDeleteConfirm(null);
      }
    } catch (err: any) {
      console.error("Deletion error:", err);
      setError(err?.message || "An unexpected error occurred while deleting");
    } finally {
      setDeleteLoading(false);
    }
  }

  const handleMoveFile = async (fileId: string, targetId: string) => {
    try {
      const res = await moveFile(fileId, targetId);
      if (res.success) {
        if (selectedFolder) await loadFiles(selectedFolder._id);
        setShowPicker(null);
      } else {
        setError(res.error || "Failed to move file");
      }
    } catch (err: any) {
      setError(err.message || "Failed to move file");
    }
  };

  const handleCopyFile = async (fileId: string, targetId: string) => {
    try {
      const res = await copyFile(fileId, targetId);
      if (res.success) {
        if (selectedFolder) await loadFiles(selectedFolder._id);
        setShowPicker(null);
      } else {
        setError(res.error || "Failed to copy file");
      }
    } catch (err: any) {
      setError(err.message || "Failed to copy file");
    }
  };

  const handleMoveFolder = async (folderId: string, targetId: string | null) => {
    try {
      const res = await moveFolder(folderId, targetId);
      if (res.success) {
        await loadFolders(selectedFolder?._id || null);
        setShowPicker(null);
      } else {
        setError(res.error || "Failed to move folder");
      }
    } catch (err: any) {
      setError(err.message || "Failed to move folder");
    }
  };

  const loadPickerFolders = async (parentId?: string) => {
    setPickerLoading(true);
    try {
      const res = await getFolders(parentId);
      if (res.success) setPickerFolders(res.data || []);
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (showPicker) {
      loadPickerFolders();
    }
  }, [showPicker]);

  const loadActivity = useCallback(async (folderId: string) => {
    try {
      setActivityLoading(true);
      const res = await getFolderActivity(folderId);
      if (res.data) setActivity(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showHistory && selectedFolder) {
      loadActivity(selectedFolder._id);
    }
  }, [showHistory, selectedFolder]);

  const filteredFolders = useMemo(() => 
    folders.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [folders, searchQuery]
  );

  const filteredFiles = useMemo(() => 
    files.filter(f =>
      f.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [files, searchQuery]
  );

  function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  const activeTransfersList = Object.values(transfers);

  return (
    <div className="h-full flex flex-col bg-surface-primary text-text-primary relative overflow-hidden">
      <header className="px-4 md:px-6 py-4 border-b border-border-default flex items-center justify-between glass sticky top-0 z-40 bg-surface-primary/80 backdrop-blur-md gap-4">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 overflow-hidden">
          <button 
            onClick={goToRoot}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <HardDrive size={20} />
          </button>
          
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-fade-right py-1">
              <button 
                onClick={() => setFolderPath([])}
                className="flex items-center gap-2 px-1 hover:text-blue-400 transition-colors group"
              >
                <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${folderPath.length === 0 ? 'text-text-primary' : 'text-text-muted opacity-40'}`}>
                  M-Drive
                </span>
              </button>

              {folderPath.map((folder, index) => (
                <div key={folder._id} className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-text-muted opacity-20 font-light">/</span>
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={`px-1 text-[10px] font-black uppercase tracking-[0.25em] transition-all hover:text-blue-400 ${index === folderPath.length - 1 ? 'text-text-primary opacity-100' : 'text-text-muted opacity-40 hover:opacity-100'}`}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-blue-400 transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Search..."
              className="px-9 py-2 rounded-xl bg-white/5 border border-border-default text-xs text-text-primary focus:ring-2 focus:ring-blue-500/50 outline-none w-32 md:w-64 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-all disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          
          <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

          {selectedFolder && (
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-all hidden sm:flex"
              >
                {viewMode === 'grid' ? <ListIcon size={16} /> : <LayoutGrid size={16} />}
              </button>
              
              <button
                onClick={() => { 
                  setShowHistory(!showHistory);
                  if (!showHistory) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('sidebar');
                    setSearchParams(newParams);
                  }
                }}
                className={`flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${showHistory ? 'bg-blue-500/20 text-blue-400' : 'text-text-secondary hover:bg-surface-hover'}`}
              >
                <History size={16} /> 
                <span className="hidden md:inline uppercase tracking-widest">Journal</span>
              </button>

              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  if (showCommunity) newParams.delete('sidebar');
                  else newParams.set('sidebar', 'community');
                  setSearchParams(newParams);
                  setShowHistory(false);
                }}
                className={`flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${showCommunity ? 'bg-emerald-500/20 text-emerald-400' : 'text-text-secondary hover:bg-surface-hover'}`}
              >
                <MessageSquare size={16} /> 
                <span className="hidden md:inline uppercase tracking-widest">Community</span>
              </button>

              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  if (showNotes) newParams.delete('sidebar');
                  else newParams.set('sidebar', 'notes');
                  setSearchParams(newParams);
                  setShowHistory(false);
                }}
                className={`flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${showNotes ? 'bg-blue-500/20 text-blue-400' : 'text-text-secondary hover:bg-surface-hover'}`}
              >
                <StickyNote size={16} /> 
                <span className="hidden md:inline uppercase tracking-widest">Notes</span>
              </button>

              <button
                onClick={goBack}
                className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg text-[10px] md:text-xs font-bold text-text-secondary hover:bg-surface-hover border border-border-default transition-all"
              >
                <ChevronLeft size={16} /> 
                <span className="hidden md:inline uppercase tracking-widest">Back</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-6 mt-4 overflow-hidden"
          >
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <p className="text-xs text-rose-400 font-medium">{error}</p>
              <button 
                onClick={() => setError("")} 
                className="text-rose-400/60 hover:text-rose-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {showCommunity && (
            <CommunitySidebar 
              folderId={selectedFolder?._id || null}
              onClose={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('sidebar');
                setSearchParams(newParams);
              }} 
            />
          )}
          {showNotes && (
            <NotesSidebar 
              folderId={selectedFolder?._id || "root"}
              onClose={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('sidebar');
                setSearchParams(newParams);
              }} 
            />
          )}
          {showHistory && (
            <HistorySidebar 
              activity={activity} 
              loading={activityLoading}
              onClose={() => setShowHistory(false)}
            />
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-xs text-text-muted font-mono tracking-widest animate-pulse">Initializing Engine...</p>
            </div>
          ) : (
            <div className="h-full flex flex-col space-y-8">
              {filteredFolders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] px-1">Sub-Folders</h3>
                  <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {filteredFolders.map(f => (
                      <motion.div
                        layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        key={f._id} onClick={() => selectFolder(f)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, item: f, type: 'folder' });
                        }}
                        className="group relative bg-surface-secondary rounded-[32px] p-6 border border-border-default hover:border-blue-500/30 transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-1"
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
              )}

              {selectedFolder && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Files</h3>
                    <div className="text-[10px] font-bold text-text-muted/50 uppercase tracking-widest">{filteredFiles.length} Storage Nodes</div>
                  </div>
                  
                  {filesLoading ? (
                    <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-default rounded-2xl bg-white/5">
                      <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center text-text-muted mb-4">
                        <HardDrive size={24} />
                      </div>
                      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">No objects in this layer</p>
                    </div>
                  ) : viewMode === 'list' ? (
                    <div className="bg-surface-secondary rounded-2xl border border-border-default overflow-hidden">
                      <table className="w-full text-left text-xs text-text-secondary">
                        <thead className="bg-black/5">
                          <tr>
                            <th className="px-6 py-4">Name</th><th className="px-6 py-4">Size</th><th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                          {filteredFiles.map(file => (
                            <tr key={file._id} className="group hover:bg-white/5" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); }}>
                              <td className="px-6 py-4 flex items-center gap-3"><FileIcon fileName={file.fileName} className="text-blue-400" />{file.fileName}</td>
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
                  ) : (
                    <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                      {filteredFiles.map(file => (
                        <motion.div
                          layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          key={file._id} 
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: 'file' }); }}
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
                          <h4 className="text-xs font-semibold text-text-primary truncate">{file.fileName}</h4>
                          <span className="text-[10px] text-text-muted">{formatSize(file.size)}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showHistory && (
            <HistorySidebar 
              activity={activity} 
              loading={activityLoading} 
              isAdmin={isAdmin} 
              onClose={() => setShowHistory(false)} 
            />
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {activeTransfersList.length > 0 && (
          <motion.div 
            initial={{ y: -50, opacity: 0, x: "-50%" }} 
            animate={{ y: 0, opacity: 1, x: "-50%" }} 
            exit={{ y: -50, opacity: 0, x: "-50%" }} 
            className="fixed top-24 left-1/2 z-[100] flex flex-col items-center gap-3 w-80 pointer-events-none"
          >
            {activeTransfersList.map(t => (
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
        )}
      </AnimatePresence>

      {showNewFolder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-secondary rounded-3xl p-8 w-full max-w-sm border border-border-default shadow-2xl">
            <h3 className="text-lg font-bold mb-6">Create Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input type="text" className="w-full bg-black/20 border border-border-default rounded-xl p-3 text-sm" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} required autoFocus placeholder="Folder Name" />
              <input type="text" className="w-full bg-black/20 border border-border-default rounded-xl p-3 text-sm" value={newFolderDesc} onChange={(e) => setNewFolderDesc(e.target.value)} placeholder="Description (optional)" />
              <div className="flex gap-2 pt-4"><button type="submit" className="btn-primary flex-1">Create</button><button type="button" onClick={() => setShowNewFolder(false)} className="btn-secondary flex-1">Cancel</button></div>
            </form>
          </motion.div>
        </div>
      )}

      {showRename && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-secondary rounded-3xl p-8 w-full max-w-sm border border-border-default shadow-2xl">
            <h3 className="text-lg font-bold mb-6">Rename</h3>
            <form onSubmit={handleRename} className="space-y-4">
              <input type="text" className="w-full bg-black/20 border border-border-default rounded-xl p-3 text-sm" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} required autoFocus />
              <div className="flex gap-2 pt-4"><button type="submit" className="btn-primary flex-1">Rename</button><button type="button" onClick={() => setShowRename(null)} className="btn-secondary flex-1">Cancel</button></div>
            </form>
          </motion.div>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110]">
          <motion.div initial={{ opacity: 0.5, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-secondary rounded-[32px] border border-border-default w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-border-default">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold capitalize">{showPicker.type} {showPicker.itemType}</h3>
                <button onClick={() => setShowPicker(null)} className="p-2 rounded-full hover:bg-white/5 transition-colors"><X size={20} /></button>
              </div>
              <p className="text-sm text-text-secondary">Select a destination folder for <span className="text-blue-400 font-bold">"{showPicker.item.fileName || showPicker.item.name}"</span></p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              <button 
                onClick={() => setPickerDestId(null)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${pickerDestId === null ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
              >
                <Home size={18} />
                <span className="text-sm font-bold uppercase tracking-widest">Root</span>
              </button>

              {pickerLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
              ) : (
                pickerFolders.map(f => (
                  <button 
                    key={f._id}
                    onClick={() => setPickerDestId(f._id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${pickerDestId === f._id ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                  >
                    <Folder size={18} />
                    <span className="text-sm font-bold truncate">{f.name}</span>
                  </button>
                ))
              )}
            </div>

            <div className="p-8 bg-black/20 flex gap-4">
              <button 
                className="btn-primary flex-1"
                onClick={() => {
                  if (showPicker.itemType === 'file') {
                    if (showPicker.type === 'move') handleMoveFile(showPicker.item._id, pickerDestId || "");
                    else handleCopyFile(showPicker.item._id, pickerDestId || "");
                  } else {
                    handleMoveFolder(showPicker.item._id, pickerDestId);
                  }
                }}
              >
                Confirm {showPicker.type}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowPicker(null)}>Cancel</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed z-[200] w-56 bg-surface-secondary/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden"
          >
            <div className="px-4 py-2 border-b border-white/5 mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted truncate">
                {contextMenu.item.fileName || contextMenu.item.name}
              </p>
            </div>

            <button 
              onClick={() => {
                setShowPicker({ type: 'move', item: contextMenu.item, itemType: contextMenu.type });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-text-secondary hover:bg-blue-600/10 hover:text-blue-400 transition-all font-bold uppercase tracking-widest"
            >
              <Move size={14} /> Move To
            </button>

            {contextMenu.type === 'file' && (
              <button 
                onClick={() => {
                  setShowPicker({ type: 'copy', item: contextMenu.item, itemType: 'file' });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-text-secondary hover:bg-indigo-600/10 hover:text-indigo-400 transition-all font-bold uppercase tracking-widest"
              >
                <Copy size={14} /> Make Copy
              </button>
            )}

            <button 
              onClick={() => {
                setRenameValue(contextMenu.item.fileName || contextMenu.item.name);
                setShowRename({ id: contextMenu.item._id, name: contextMenu.item.fileName || contextMenu.item.name, type: contextMenu.type });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-text-secondary hover:bg-surface-hover transition-all font-bold uppercase tracking-widest"
            >
              <Pencil size={14} /> Rename
            </button>

            <div className="h-px bg-white/5 my-1" />

            <button 
              onClick={() => {
                setShowDeleteConfirm({ id: contextMenu.item._id, name: contextMenu.item.fileName || contextMenu.item.name, type: contextMenu.type });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-all font-bold uppercase tracking-widest"
            >
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {previewFile && (
        <FilePreviewModal 
          isOpen={!!previewFile} 
          onClose={() => setPreviewFile(null)} 
          fileId={previewFile._id}
          fileName={previewFile.fileName} 
          mimeType={previewFile.mimeType} 
          downloadUrl={previewFile.downloadUrl} 
          size={previewFile.size} 
          onSave={() => selectedFolder && loadFiles(selectedFolder._id)}
        />
      )}
      {/* Manage Access Modal */}
      {showManageAccess && (
        <ManageAccessModal
          isOpen={!!showManageAccess}
          onClose={() => setShowManageAccess(null)}
          folderId={showManageAccess.id}
          folderName={showManageAccess.name}
          currentPermissions={showManageAccess.permissions}
          onUpdate={loadFolders}
        />
      )}
      <DeleteConfirmationModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={confirmDelete}
        itemName={showDeleteConfirm?.name || ""}
        itemType={showDeleteConfirm?.type || "file"}
        loading={deleteLoading}
      />
      {/* Global FAB */}
      {isFolderEditor && (
        <div className="fixed bottom-8 right-8 z-50">
          <AnimatePresence>
            {showFabMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute bottom-16 right-0 flex flex-col items-end gap-3 mb-2"
              >
                <button
                  onClick={() => { setShowNewFolder(true); setShowFabMenu(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-secondary border border-border-default text-xs font-bold text-text-primary shadow-2xl whitespace-nowrap"
                >
                  <FolderPlus size={16} className="text-emerald-400" /> NEW FOLDER
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-4">
            {selectedFolder && (
              <button 
                onClick={handleUpload}
                className="group relative h-14 px-8 rounded-full bg-blue-600 flex items-center gap-3 text-[11px] font-black text-white shadow-[0_20px_40px_-5px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Upload size={16} />
                </div>
                <span className="tracking-[0.2em] relative z-10">UPLOAD</span>
              </button>
            )}

            <button 
              onClick={() => setShowFabMenu(!showFabMenu)}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_20px_40px_-5px_rgba(79,70,229,0.4)] transition-all duration-300 ${showFabMenu ? 'bg-rose-500 rotate-45' : 'bg-indigo-600 hover:bg-indigo-500 font-bold'}`}
            >
              <Plus size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
