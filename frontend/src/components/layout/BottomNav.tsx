import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Plus, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Home', id: 'bottom-nav-dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Expenses', id: 'bottom-nav-expenses' },
  { to: '/settings', icon: Settings, label: 'Settings', id: 'bottom-nav-settings' },
];

export function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-area-inset-bottom">
      {/* Glass bar */}
      <div className="flex items-center justify-around px-4 pt-3 pb-5 bottom-nav-glass border-t border-slate-200/80 dark:border-white/[0.08] transition-colors duration-300">
        {/* Left 2 tabs */}
        {NAV_ITEMS.slice(0, 2).map(({ to, icon: Icon, label, id }) => (
          <NavLink
            key={to}
            to={to}
            id={id}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all duration-200 ${
                isActive ? 'text-violet-400' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottom-indicator"
                    className="absolute -top-0.5 w-6 h-0.5 rounded-full bg-violet-400"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Center FAB */}
        <motion.button
          id="fab-add-expense"
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/add')}
          className="fab -mt-6"
          aria-label="Add expense"
        >
          <Plus size={24} />
        </motion.button>

        {/* Right tab */}
        {NAV_ITEMS.slice(2).map(({ to, icon: Icon, label, id }) => (
          <NavLink
            key={to}
            to={to}
            id={id}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all duration-200 ${
                isActive ? 'text-violet-400' : 'text-slate-500'
              }`
            }
          >
            {() => (
              <>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
