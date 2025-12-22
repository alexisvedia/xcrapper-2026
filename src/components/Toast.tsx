'use client';

import { useAppStore } from '@/store';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Toast() {
  const { toast, hideToast } = useAppStore();

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[var(--accent-green)]" />,
    error: <XCircle className="w-5 h-5 text-[var(--accent-red)]" />,
    info: <Info className="w-5 h-5 text-[var(--accent-cyan)]" />,
  };

  const borderColors = {
    success: 'border-[var(--accent-green)]',
    error: 'border-[var(--accent-red)]',
    info: 'border-[var(--accent-cyan)]',
  };

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          className={`toast border-l-4 ${borderColors[toast.type]}`}
        >
          {icons[toast.type]}
          <span className="text-[var(--text-primary)]">{toast.message}</span>
          <button
            onClick={hideToast}
            className="ml-2 p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
