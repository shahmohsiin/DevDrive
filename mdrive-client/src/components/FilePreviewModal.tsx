import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Edit3,
  Save,
} from "lucide-react";
import { CodeEditor } from "./CodeEditor";
import { getUploadUrl, confirmUpload } from "../lib/api";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  size: number;
  onSave?: () => void;
}

export function FilePreviewModal({ 
  isOpen, 
  onClose, 
  fileId,
  fileName, 
  mimeType, 
  downloadUrl,
  size,
  onSave
}: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'source' | 'live'>('source');
  const containerRef = useRef<HTMLDivElement>(null);

  const isImage = mimeType.startsWith("image/");
  const isPDF = mimeType === "application/pdf";
  const isText = mimeType.startsWith("text/") || mimeType === "application/json" || fileName.endsWith(".ts") || fileName.endsWith(".tsx") || fileName.endsWith(".md");
  const isHTML = mimeType === "text/html" || fileName.endsWith(".html");

  useEffect(() => {
    if (isOpen && isText) {
      setLoadingText(true);
      fetch(downloadUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setEditedContent(text);
          setLoadingText(false);
        })
        .catch(err => {
          console.error("Failed to load text content:", err);
          setLoadingText(false);
        });
    } else {
      setTextContent(null);
      setIsEditing(false);
    }
    setZoom(1);
  }, [isOpen, isText, downloadUrl]);

  async function calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSave = async () => {
    if (!fileId) return;
    setSaveLoading(true);
    try {
      const sha256 = await calculateHash(editedContent);
      const blob = new Blob([editedContent], { type: mimeType });
      const newSize = blob.size;

      // 1. Get upload URL
      const urlRes = await getUploadUrl({
        fileId,
        fileName,
        mimeType,
        size: newSize,
        sha256,
        folderId: "", // Backend handles folderId via fileId for revisions
        relativePath: fileName
      });

      if (!urlRes.data) throw new Error("Failed to get upload URL");

      // 2. Upload to B2
      const uploadRes = await fetch(urlRes.data.uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": mimeType }
      });

      if (!uploadRes.ok) throw new Error("Cloud upload failed");

      // 3. Confirm
      await confirmUpload({
        fileId: urlRes.data.fileId,
        b2Key: urlRes.data.b2Key,
        sha256,
        size: newSize
      });

      setTextContent(editedContent);
      setIsEditing(false);
      if (onSave) onSave();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-primary/95 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative bg-surface-secondary rounded-2xl w-full max-w-[95vw] h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-border-default transition-colors duration-300 ring-1 ring-white/5"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between bg-surface-secondary/50 border-b border-border-default z-10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 ring-1 ring-blue-500/20">
                  {isImage ? <ImageIcon size={20} /> : isPDF ? <FileText size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    {fileName}
                    <span className="px-1.5 py-0.5 rounded bg-surface-hover text-[9px] text-text-muted font-mono uppercase tracking-wider">{formatFileSize(size)}</span>
                  </h3>
                  <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-0.5 font-medium">{mimeType}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isHTML && isEditing && (
                  <div className="flex items-center bg-surface-hover rounded-lg p-1 mr-2 border border-border-default">
                    <button 
                      onClick={() => setPreviewMode('source')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${previewMode === 'source' ? 'bg-blue-600 text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      Source
                    </button>
                    <button 
                      onClick={() => setPreviewMode('live')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${previewMode === 'live' ? 'bg-emerald-600 text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      Live
                    </button>
                  </div>
                )}

                {isText && !isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-[10px] font-bold uppercase tracking-widest transition-all mr-2"
                  >
                    <Edit3 size={14} /> Edit File
                  </button>
                )}

                {isEditing && (
                  <div className="flex items-center gap-2 mr-2">
                    <button 
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {saveLoading ? <RotateCcw size={14} className="animate-spin" /> : <Save size={14} />} 
                      Save Changes
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setEditedContent(textContent || ""); }}
                      className="px-3 py-1.5 rounded-lg hover:bg-surface-hover text-text-secondary text-[10px] font-bold uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {isImage && (
                  <div className="flex items-center bg-surface-hover rounded-lg p-1 mr-2 border border-border-default">
                    <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-1.5 rounded-md hover:bg-surface-active text-text-secondary transition-all"><ZoomOut size={16} /></button>
                    <div className="w-12 text-center text-[10px] font-mono font-bold text-text-primary">{Math.round(zoom * 100)}%</div>
                    <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-1.5 rounded-md hover:bg-surface-active text-text-secondary transition-all"><ZoomIn size={16} /></button>
                  </div>
                )}
                
                <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors" title="Download"><Download size={18} /></button>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors" title="Open Externally"><ExternalLink size={18} /></a>
                <div className="w-px h-6 bg-border-default mx-2" />
                <button onClick={onClose} className="p-2 rounded-xl bg-surface-hover hover:bg-accent-rose/10 hover:text-accent-rose text-text-secondary transition-all duration-300"><X size={20} /></button>
              </div>
            </div>

            {/* Content Area */}
            <div ref={containerRef} className="flex-1 overflow-auto bg-surface-primary relative flex items-center justify-center p-0 transition-colors duration-300">
              {isImage ? (
                <div className="flex items-center justify-center min-w-full min-h-full p-8">
                  <motion.img animate={{ scale: zoom }} src={downloadUrl} className="max-w-[70vw] h-auto object-contain shadow-2xl rounded-lg border border-white/5" />
                </div>
              ) : isText ? (
                <div className="w-full h-full flex flex-col">
                  {isEditing ? (
                    <div className="flex-1 flex overflow-hidden">
                      {isHTML && previewMode === 'live' ? (
                        <iframe 
                          srcDoc={editedContent}
                          sandbox="allow-scripts"
                          className="w-full h-full bg-white"
                          title="HTML Preview"
                        />
                      ) : (
                        <CodeEditor 
                          value={editedContent} 
                          onChange={setEditedContent}
                          language={isHTML ? 'html' : fileName.split('.').pop()}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="p-8 w-full max-w-5xl mx-auto h-full overflow-auto">
                       <div className="bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden shadow-2xl min-h-full">
                          <div className="px-4 py-2 bg-[#161b22] border-b border-white/5 flex items-center justify-between sticky top-0">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                              <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                            </div>
                            <span className="text-[10px] font-mono text-gray-500">{fileName}</span>
                          </div>
                          <div className="p-8 font-mono text-[13px] text-gray-300 leading-relaxed">
                            {loadingText ? (
                              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-600 italic">
                                Loading buffer...
                              </div>
                            ) : (
                              <pre className="whitespace-pre-wrap selection:bg-blue-500/30">
                                {textContent || "// Empty File"}
                              </pre>
                            )}
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-12">
                  <div className="w-24 h-24 rounded-3xl bg-surface-secondary flex items-center justify-center mx-auto mb-8 text-text-muted border border-border-default"><Eye size={40} /></div>
                  <h4 className="text-xl font-bold text-text-primary mb-3">No Preview</h4>
                  <div className="flex justify-center gap-4">
                    <button onClick={handleDownload} className="btn-primary flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-lg text-white font-bold text-xs uppercase tracking-widest"><Download size={16} /> Download</button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-border-default bg-surface-secondary/50 flex items-center justify-between sticky bottom-0">
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isEditing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} `} />
                  <span className="text-[10px] text-text-muted font-mono tracking-tighter uppercase">
                    {isEditing ? 'Modified Content in Buffer' : 'Cloud Synchronized'}
                  </span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase italic">Edit Mode Protocol</span>
                  <div className="w-px h-3 bg-border-default" />
                  <span className="text-[10px] text-text-muted font-medium uppercase">Developer Preview</span>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
