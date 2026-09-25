import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../../lib/utils';
import { Logo } from './Logo';

interface StickyQuickBarProps {
  totalPaise: number;
  periodLabel: string;
}

export function StickyQuickBar({ totalPaise, periodLabel }: StickyQuickBarProps) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.95 }}
          style={{ position: 'fixed' }}
          className="top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full glass-3d border border-white/15 backdrop-blur-2xl shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
        >
          {/* Logo emblem */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 group cursor-pointer"
            title="Scroll to top"
          >
            <Logo iconOnly size="xs" />
            <span className="hidden sm:inline text-xs font-semibold text-white group-hover:text-violet-300 transition-colors">
              SpendSense
            </span>
          </button>

          <span className="w-px h-4 bg-white/15" />

          {/* Period & Total */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium hidden md:inline">{periodLabel}:</span>
            <span className="font-extrabold text-white tracking-wide tnum" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {formatINR(totalPaise)}
            </span>
          </div>

          <span className="w-px h-4 bg-white/15" />

          {/* Quick Action Button */}
          <button
            onClick={() => navigate('/add')}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold text-xs shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_20px_rgba(124,58,237,0.7)] transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Back to top icon */}
          <button
            onClick={scrollToTop}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Scroll to top"
          >
            <ArrowUp size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
