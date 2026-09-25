import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Save, Loader2, ChevronDown, Check } from 'lucide-react';
import {
  getCategories,
  createExpense,
  updateExpense,
  invalidateAllExpenseData,
  onExpenseSaved,
  onExpenseUpdated,
} from '../../lib/api';
import type { Expense, ExpenseCreate, Category } from '../../lib/types';

interface FormPrefill {
  item?: string;
  barcode?: string;
  price?: number;          // INR decimal from photo extraction
  quantity?: number;
  category?: string;       // category string e.g. "Groceries", "Household", "Biscuits"
  category_id?: number;
  expiry_date?: string;    // ISO date string e.g. "2026-12-31"
  purchase_date?: string;
  source?: 'scan' | 'photo' | 'manual';
}

interface ExpenseFormProps {
  expense?: Expense | null; // null = create mode
  prefill?: FormPrefill;   // pre-populate fields (e.g. from barcode scan)
  onSuccess?: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 16);
}

function matchCategory(
  categoryName: string | undefined | null,
  categories: Category[],
): number | undefined {
  if (!categoryName || !categories.length) return undefined;
  const name = categoryName.toLowerCase().trim();

  // 1. Direct exact or includes match
  const direct = categories.find(
    (c) =>
      c.name.toLowerCase() === name ||
      name.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(name),
  );
  if (direct) return direct.id;

  // 2. Semantic keywords mapping
  const keywords: Record<string, string[]> = {
    Groceries: [
      'food', 'snack', 'biscuit', 'cookie', 'beverage', 'drink', 'water',
      'cereal', 'dairy', 'milk', 'cheese', 'butter', 'bread', 'fruit',
      'vegetable', 'meat', 'chicken', 'fish', 'sweet', 'chocolate', 'oil',
      'spice', 'rice', 'wheat', 'flour', 'noodle', 'pasta', 'sauce', 'tea', 'coffee',
    ],
    Dining: ['restaurant', 'cafe', 'coffee shop', 'diner', 'eatery', 'bar', 'pub', 'burger', 'pizza', 'meal'],
    Transport: ['fuel', 'petrol', 'diesel', 'gas', 'cab', 'taxi', 'uber', 'ola', 'auto', 'metro', 'bus', 'train', 'flight', 'fare', 'toll', 'parking'],
    Health: ['medicine', 'pharma', 'pharmacy', 'hospital', 'clinic', 'doctor', 'drug', 'tablet', 'vitamin', 'fitness', 'hygiene', 'soap', 'shampoo', 'paste', 'toothpaste'],
    Household: ['appliance', 'electronic', 'tv', 'mobile', 'phone', 'laptop', 'clean', 'detergent', 'furniture', 'kitchen', 'home', 'battery', 'bulb'],
    Other: ['other', 'misc', 'general'],
  };

  for (const [targetCat, terms] of Object.entries(keywords)) {
    if (terms.some((term) => name.includes(term))) {
      const match = categories.find((c) => c.name.toLowerCase() === targetCat.toLowerCase());
      if (match) return match.id;
    }
  }

  const otherCat = categories.find((c) => c.name.toLowerCase() === 'other');
  return otherCat?.id;
}

export function ExpenseForm({ expense, prefill, onSuccess }: ExpenseFormProps) {
  const qc = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const [form, setForm] = useState(() => ({
    item: prefill?.item ?? '',
    price: prefill?.price != null ? prefill.price.toFixed(2) : '',
    quantity: prefill?.quantity != null ? String(prefill.quantity) : '',
    category_id: prefill?.category_id
      ? String(prefill.category_id)
      : '',
    purchase_date: prefill?.purchase_date
      ? prefill.purchase_date.slice(0, 10) + 'T00:00'
      : todayISO(),
    expiry_date: prefill?.expiry_date
      ? prefill.expiry_date.slice(0, 10) + 'T00:00'
      : '',
    notes: '',
    barcode: prefill?.barcode ?? '',
    source: (prefill?.source ?? 'manual') as 'scan' | 'photo' | 'manual',
  }));

  // Auto-match category when categories load or prefill arrives
  useEffect(() => {
    if (!form.category_id && prefill?.category && categories.length > 0) {
      const matched = matchCategory(prefill.category, categories);
      if (matched) {
        setForm((prev) => ({ ...prev, category_id: String(matched) }));
      }
    }
  }, [categories, prefill?.category, form.category_id]);

  // Keep form in sync if prefill prop updates
  useEffect(() => {
    if (prefill && !expense) {
      setForm((prev) => {
        const matchedCat = prefill.category
          ? matchCategory(prefill.category, categories)
          : undefined;
        return {
          ...prev,
          item: prefill.item ?? prev.item,
          price: prefill.price != null ? prefill.price.toFixed(2) : prev.price,
          quantity: prefill.quantity != null ? String(prefill.quantity) : prev.quantity,
          barcode: prefill.barcode ?? prev.barcode,
          purchase_date: prefill.purchase_date
            ? prefill.purchase_date.slice(0, 10) + 'T00:00'
            : prev.purchase_date,
          expiry_date: prefill.expiry_date
            ? prefill.expiry_date.slice(0, 10) + 'T00:00'
            : prev.expiry_date,
          source: (prefill.source ?? prev.source) as 'scan' | 'photo' | 'manual',
          category_id: matchedCat
            ? String(matchedCat)
            : prefill.category_id
            ? String(prefill.category_id)
            : prev.category_id,
        };
      });
    }
  }, [prefill, categories, expense]);

  // Pre-fill when editing
  useEffect(() => {
    if (expense) {
      setForm({
        item: expense.item,
        price: (expense.price_paise / 100).toString(),
        quantity: expense.quantity?.toString() ?? '',
        category_id: expense.category_id?.toString() ?? '',
        purchase_date: expense.purchase_date?.slice(0, 16) ?? todayISO(),
        expiry_date: expense.expiry_date?.slice(0, 16) ?? '',
        notes: expense.notes ?? '',
        barcode: expense.barcode ?? '',
        source: expense.source,
      });
    }
  }, [expense]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const field = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: async (newExpense) => {
      onExpenseSaved(qc, newExpense);
      await invalidateAllExpenseData(qc);
      toast.success('Expense saved!');
      onSuccess?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExpenseCreate> }) =>
      updateExpense(id, data),
    onSuccess: async (updatedExpense) => {
      onExpenseUpdated(qc, updatedExpense);
      await invalidateAllExpenseData(qc);
      toast.success('Expense updated!');
      onSuccess?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price_paise = Math.round(parseFloat(form.price) * 100);
    if (isNaN(price_paise) || price_paise < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!form.item.trim()) {
      toast.error('Item name is required');
      return;
    }

    const payload: ExpenseCreate = {
      item: form.item.trim(),
      price_paise,
      quantity: form.quantity ? parseFloat(form.quantity) : null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      purchase_date: form.purchase_date || null,
      expiry_date: form.expiry_date || null,
      barcode: form.barcode.trim() || null,
      notes: form.notes.trim() || null,
      source: form.source,
    };

    if (expense) {
      updateMut.mutate({ id: expense.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <form onSubmit={handleSubmit}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Item */}
        <motion.div variants={itemVariants} className="form-group">
          <label className="form-label">Item name *</label>
          <input
            className="input-glass"
            placeholder="e.g. Amul Milk 1L"
            value={form.item}
            onChange={(e) => field('item', e.target.value)}
            required
          />
        </motion.div>

        {/* Price + Quantity */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">Price (₹) *</label>
            <input
              className="input-glass"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => field('price', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input
              className="input-glass"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="1"
              value={form.quantity}
              onChange={(e) => field('quantity', e.target.value)}
            />
          </div>
        </motion.div>

        {/* Category — custom dropdown (native select mangles emoji+name on Windows) */}
        <motion.div variants={itemVariants} className="form-group" ref={dropdownRef}>
          <label className="form-label">Category</label>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="input-glass w-full flex items-center justify-between text-left"
          >
            <span>
              {form.category_id
                ? (() => {
                    const c = categories.find((c) => String(c.id) === form.category_id);
                    return c ? `${c.icon} ${c.name}` : '— None —';
                  })()
                : '— None —'}
            </span>
            <ChevronDown
              size={16}
              className={`text-slate-500 transition-transform duration-200 flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200/90 dark:border-white/10 overflow-hidden bg-white/95 dark:bg-[rgba(12,12,28,0.97)] backdrop-blur-2xl shadow-2xl"
            >
              {/* None option */}
              <button
                type="button"
                onClick={() => { field('category_id', ''); setDropdownOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <span>— None —</span>
                {!form.category_id && <Check size={14} className="text-violet-500 dark:text-violet-400" />}
              </button>
              <div className="border-t border-slate-100 dark:border-white/[0.06]" />
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { field('category_id', String(c.id)); setDropdownOpen(false); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </span>
                  {String(c.id) === form.category_id && <Check size={14} className="text-violet-500 dark:text-violet-400 flex-shrink-0" />}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Dates */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">Purchase date</label>
            <input
              className="input-glass"
              type="datetime-local"
              value={form.purchase_date}
              onChange={(e) => field('purchase_date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Expiry date</label>
            <input
              className="input-glass"
              type="datetime-local"
              value={form.expiry_date}
              onChange={(e) => field('expiry_date', e.target.value)}
            />
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div variants={itemVariants} className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="input-glass resize-none"
            rows={2}
            placeholder="Optional notes…"
            value={form.notes}
            onChange={(e) => field('notes', e.target.value)}
          />
        </motion.div>

        {/* Barcode — shown when prefilled from scan, or always editable */}
        <motion.div variants={itemVariants} className="form-group">
          <label className="form-label">Barcode</label>
          <input
            className="input-glass font-mono text-sm"
            placeholder="e.g. 8901030866112"
            value={form.barcode}
            onChange={(e) => field('barcode', e.target.value)}
          />
        </motion.div>

        {/* Submit */}
        <motion.div variants={itemVariants} className="pt-2">
          <button
            type="submit"
            className="btn-primary w-full h-12 text-base"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {expense ? 'Update Expense' : 'Save Expense'}
          </button>
        </motion.div>
      </motion.div>
    </form>
  );
}
