import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Expenses', id: 'nav-expenses' },
  { to: '/settings', icon: Settings, label: 'Settings', id: 'nav-settings' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // ignore localStorage access errors
      }
      return next;
    });
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col min-h-screen border-r border-slate-200/80 dark:border-white/[0.06] sidebar-glass backdrop-blur-xl sticky top-0 z-20 transition-[width,background-color] duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header / Logo */}
        <div className={`py-6 border-b border-slate-200/80 dark:border-white/[0.04] transition-all ${collapsed ? 'px-3 flex flex-col items-center gap-4' : 'px-5 flex items-center justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {collapsed ? (
              <Logo iconOnly size="sm" />
            ) : (
              <Logo size="md" />
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            id="sidebar-toggle-btn"
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-white/10 flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Desktop Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={to}
              to={to}
              id={id}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex items-center ${
                  collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                } rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'nav-active'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={
                      isActive
                        ? 'text-violet-400'
                        : 'text-slate-500 group-hover:text-slate-300 transition-colors'
                    }
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {isActive && !collapsed && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400"
                    />
                  )}

                  {/* Tooltip on hover when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 border border-white/10 rounded-lg text-xs font-medium text-white shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Footer */}
        <div className={`py-4 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col gap-3 ${collapsed ? 'px-2 items-center' : 'px-4'}`}>
          <ThemeToggle compact={collapsed} className={collapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full justify-center'} />
          {collapsed ? (
            <div className="relative group flex justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse cursor-pointer" />
              <div className="absolute left-full ml-3 px-3 py-1 bg-slate-900/95 border border-white/10 rounded-lg text-xs text-slate-300 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                Backend connected
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-500">Backend connected</span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 bg-black/65 backdrop-blur-sm z-40"
            />

            {/* Slide-out Drawer */}
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 sidebar-glass backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 flex flex-col z-50 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="px-6 py-6 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Logo size="md" />
                </div>
                <button
                  onClick={onMobileClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Nav */}
              <nav className="flex-1 px-4 py-4 space-y-1.5">
                {NAV_ITEMS.map(({ to, icon: Icon, label, id }) => (
                  <NavLink
                    key={to}
                    to={to}
                    id={`mobile-drawer-${id}`}
                    end={to === '/'}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'nav-active'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={20}
                          className={isActive ? 'text-violet-500 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}
                        />
                        <span>{label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Drawer Footer */}
              <div className="px-6 py-6 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col gap-4">
                <ThemeToggle className="w-full justify-center" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-500">Backend connected</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
