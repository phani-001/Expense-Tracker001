import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overlay"
            onClick={onClose}
          />

          {/* Sheet — slides up on mobile, centered modal on desktop */}
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto
              lg:top-1/2 lg:left-1/2 lg:bottom-auto lg:right-auto
              lg:-translate-x-1/2 lg:-translate-y-1/2
              lg:w-[560px] lg:max-h-[80vh]
              rounded-t-3xl lg:rounded-3xl
              bg-white/95 dark:bg-[#0D0D1E] border border-slate-200/90 dark:border-white/10
              text-slate-900 dark:text-white
              shadow-2xl backdrop-blur-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08]">
                <h2
                  className="font-outfit font-semibold text-lg text-slate-900 dark:text-white"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {title}
                </h2>
                <button onClick={onClose} className="btn-ghost p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
