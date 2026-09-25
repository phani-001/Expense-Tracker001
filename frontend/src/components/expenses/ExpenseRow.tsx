import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense } from '../../lib/types';
import { formatINR } from '../../lib/utils';

interface ExpenseRowProps {
  expense: Expense;
  onEdit?: (e: Expense) => void;
  onDelete?: (id: number) => void;
  onClick?: (e: Expense) => void;
  delay?: number;
}

export function ExpenseRow({ expense, onEdit, onDelete, onClick, delay = 0 }: ExpenseRowProps) {
  const icon = expense.category?.icon ?? '📦';
  const color = expense.category?.color ?? '#607D8B';
  const dateStr = expense.purchase_date
    ? format(new Date(expense.purchase_date), 'd MMM')
    : format(new Date(expense.created_at), 'd MMM');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, scale: 0.96 }}
      transition={{ duration: 0.35, delay, ease: [0.23, 1, 0.32, 1] }}
      onClick={() => onClick?.(expense)}
      className={`glass p-4 group flex items-center gap-4 hover:shadow-glass-hover transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.995]' : 'cursor-default'
      }`}
    >
      {/* Category icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        {icon}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{expense.item}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">{dateStr}</span>
          {expense.category && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs text-slate-500">{expense.category.name}</span>
            </>
          )}
          {expense.quantity && expense.quantity !== 1 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs text-slate-500">×{expense.quantity}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <span
        className="font-bold text-slate-900 dark:text-white text-sm flex-shrink-0"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        {formatINR(expense.price_paise)}
      </span>

      {/* Action buttons — appear on hover */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          whileHover={{ opacity: 1 }}
          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
        >
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(expense);
              }}
              className="p-2 rounded-lg hover:bg-violet-500/20 text-slate-500 hover:text-violet-400 transition-colors"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(expense.id);
              }}
              className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
