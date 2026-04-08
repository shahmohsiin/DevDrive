import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'file' | 'folder';
  loading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  loading = false
}: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-surface-primary/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="bg-surface-secondary rounded-2xl w-full max-w-xs border border-border-default shadow-2xl overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Confirm Delete</h3>
                <button 
                  onClick={onClose}
                  className="p-1 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-text-primary mb-1">
                  Delete this {itemType}?
                </p>
                <p className="text-xs font-semibold break-all text-accent-rose mb-2">
                  "{itemName}"
                </p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  This action is permanent and cannot be undone.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="btn-secondary flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="btn-danger flex-1 py-2 text-xs flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-accent-rose/30 border-t-accent-rose rounded-full"
                    />
                  ) : "Delete"}
                </button>
              </div>
            </div>
            
            {loading && (
              <div className="h-0.5 w-full bg-accent-rose/10 overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="h-full w-1/3 bg-accent-rose"
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
