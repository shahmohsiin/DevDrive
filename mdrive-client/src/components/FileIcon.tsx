import { 
  FileText, 
  Image as ImageIcon, 
  FileVideo, 
  FileAudio, 
  FileCode, 
  FileArchive, 
  File as FileIconBase,
  Folder,
  Globe,
  Settings,
  Lock,
  FileDigit,
  Type
} from "lucide-react";

interface FileIconProps {
  fileName: string;
  mimeType?: string;
  className?: string;
  size?: number;
}

export function FileIcon({ fileName, className, size = 20 }: FileIconProps) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  
  if (ext === "folder") return <Folder size={size} className={className} />;

  // Map by extension
  const extMap: Record<string, any> = {
    ts: FileCode,
    tsx: FileCode,
    js: FileCode,
    jsx: FileCode,
    html: Globe,
    css: Type,
    json: FileDigit,
    md: FileText,
    txt: FileText,
    png: ImageIcon,
    jpg: ImageIcon,
    jpeg: ImageIcon,
    gif: ImageIcon,
    svg: ImageIcon,
    webp: ImageIcon,
    pdf: FileText,
    zip: FileArchive,
    rar: FileArchive,
    "7z": FileArchive,
    mp4: FileVideo,
    mov: FileVideo,
    mp3: FileAudio,
    wav: FileAudio,
    env: Lock,
    config: Settings,
  };

  const Icon = extMap[ext] || FileIconBase;

  return <Icon size={size} className={className} />;
}
