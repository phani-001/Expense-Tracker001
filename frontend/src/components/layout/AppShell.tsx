import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Plus, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PageTransition } from './PageTransition';
import { ScrollProgressBar } from '../ui/ScrollProgressBar';
import { FloatingBackgroundOrbs } from '../ui/FloatingElements';
import { SpotlightGrid } from '../ui/SpotlightGrid';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

export function AppShell() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative z-10 w-full overflow-x-hidden bg-[var(--bg-void)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Interactive Cursor Spotlight Grid */}
      <SpotlightGrid />

      {/* Dynamic Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Atmospheric Ambient Floating Orbs */}
      <FloatingBackgroundOrbs />

      {/* Collapsible desktop sidebar & mobile drawer */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Main content container */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Mobile Top App Bar with Drawer Toggle */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-white/[0.08] bg-[var(--bg-surface)] backdrop-blur-xl transition-colors duration-300">
          <button
            id="mobile-drawer-toggle"
            onClick={() => setMobileNavOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Open menu drawer"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          <ThemeToggle compact className="p-1.5" />
        </header>

        {/* Page Content */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      {/* Desktop floating add button */}
      <motion.button
        id="desktop-fab-add"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/add')}
        className="hidden lg:flex fixed bottom-8 right-8 items-center gap-2 z-30
          bg-gradient-to-r from-violet-600 to-cyan-500
          text-white font-semibold px-5 py-3 rounded-2xl
          shadow-[0_8px_30px_rgba(124,58,237,0.45)]
          hover:shadow-[0_12px_40px_rgba(124,58,237,0.6)]
          transition-shadow duration-300 cursor-pointer"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        <Plus size={20} />
        Add Expense
      </motion.button>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

