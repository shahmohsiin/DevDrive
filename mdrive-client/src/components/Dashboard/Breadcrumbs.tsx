import type { Dispatch, SetStateAction } from "react";
import { HardDrive } from "lucide-react";
import type { DashboardFolderItem } from "./types";

interface BreadcrumbsProps {
  folderPath: DashboardFolderItem[];
  goToRoot: () => void;
  navigateToBreadcrumb: (index: number) => void;
  setFolderPath: Dispatch<SetStateAction<DashboardFolderItem[]>>;
}

export function Breadcrumbs({ 
  folderPath, 
  goToRoot, 
  navigateToBreadcrumb, 
  setFolderPath 
}: BreadcrumbsProps) {
  return (
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
              DevDrive
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
  );
}
