import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  X,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Barcode as BarcodeIcon,
  FileText,
  Package,
  ExternalLink,
} from 'lucide-react';
import type { Expense } from '../../lib/types';
import { formatINR, daysUntil } from '../../lib/utils';
import { BASE } from '../../lib/api';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

export function ExpenseDetailModal({
  expense,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ExpenseDetailModalProps) {
  if (!isOpen || !expense) return null;

  const category = expense.category;
  const catColor = category?.color || '#8B5CF6';
  const catIcon = category?.icon || '📦';

  // Expiry date calculation
  const expiryDays = expense.expiry_date ? daysUntil(expense.expiry_date) : null;
  const isExpired = expiryDays !== null && expiryDays < 0;
  const isExpiringSoon = expiryDays !== null && expiryDays >= 0 && expiryDays <= 7;

  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete "${expense.item}"?`)) {
      onDelete(expense.id);
      onClose();
    }
  };

  const handleEditClick = () => {
    onClose();
    onEdit(expense);
  };

  // Image URL if present
  const imageUrl = expense.image_path
    ? expense.image_path.startsWith('http')
      ? expense.image_path
      : `${BASE ? BASE : ''}/${expense.image_path.replace(/^\/+/, '')}`
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Panel (Bottom Sheet on mobile, centered Modal on desktop) */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto
            bg-white/95 dark:bg-[#0C0D24]/95 border border-slate-200/90 dark:border-white/10 rounded-t-3xl sm:rounded-3xl
            p-6 shadow-2xl backdrop-blur-2xl flex flex-col gap-5 text-slate-900 dark:text-white"
        >
          {/* Top handle on mobile */}
          <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full self-center -mt-2 mb-1" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: `${catColor}25`,
                  border: `1px solid ${catColor}50`,
                }}
              >
                {catIcon}
              </div>
              <div>
                <h2
                  className="text-xl font-bold text-slate-900 dark:text-white leading-tight"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {expense.item}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{
                      background: `${catColor}20`,
                      color: catColor,
                      border: `1px solid ${catColor}40`,
                    }}
                  >
                    {category?.name || 'Uncategorised'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    via {expense.source}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Price display */}
          <div className="glass p-4 rounded-2xl flex items-baseline justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Total Amount
            </span>
            <span
              className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {formatINR(expense.price_paise)}
            </span>
          </div>

          {/* Optional Image */}
          {imageUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 max-h-48 group">
              <img
                src={imageUrl}
                alt={expense.item}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                <ExternalLink size={12} />
                View Full
              </a>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Purchase Date */}
            <div className="glass p-3.5 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Calendar size={14} className="text-violet-400" />
                Purchase Date
              </div>
              <p className="font-medium text-white text-xs sm:text-sm">
                {expense.purchase_date
                  ? format(new Date(expense.purchase_date), 'dd MMM yyyy')
                  : '—'}
              </p>
            </div>

            {/* Quantity */}
            <div className="glass p-3.5 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Package size={14} className="text-cyan-400" />
                Quantity
              </div>
              <p className="font-medium text-white text-xs sm:text-sm">
                {expense.quantity != null ? `${expense.quantity}` : '—'}
              </p>
            </div>

            {/* Expiry Date */}
            <div className="glass p-3.5 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <Clock size={14} className="text-amber-400" />
                Expiry Date
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-medium text-white text-xs sm:text-sm">
                  {expense.expiry_date
                    ? format(new Date(expense.expiry_date), 'dd MMM yyyy')
                    : '—'}
                </p>
                {expiryDays !== null && (
                  <span
                    className={`text-[10px] font-medium ${
                      isExpired
                        ? 'text-red-400'
                        : isExpiringSoon
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {isExpired
                      ? `Expired ${Math.abs(expiryDays)}d ago`
                      : expiryDays === 0
                      ? 'Expires today'
                      : `Expires in ${expiryDays}d`}
                  </span>
                )}
              </div>
            </div>

            {/* Barcode */}
            <div className="glass p-3.5 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <BarcodeIcon size={14} className="text-pink-400" />
                Barcode
              </div>
              <p className="font-mono text-white text-xs truncate">
                {expense.barcode || '—'}
              </p>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="glass p-3.5 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <FileText size={14} className="text-slate-300" />
                Notes
              </div>
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Created at footer */}
          <div className="text-[11px] text-slate-500 text-center">
            Added on {format(new Date(expense.created_at), 'dd MMM yyyy, hh:mm a')}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleEditClick}
              className="btn-ghost flex items-center justify-center gap-2 py-3 rounded-xl text-slate-700 dark:text-white font-medium hover:bg-black/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              <Pencil size={16} className="text-violet-500 dark:text-violet-400" />
              Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className="btn-danger flex items-center justify-center gap-2 py-3 rounded-xl font-medium cursor-pointer"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
