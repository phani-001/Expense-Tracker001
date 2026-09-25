import { useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getExpenses, getCategories, deleteExpense, invalidateAllExpenseData, onExpenseDeleted } from '../lib/api';
import { ExpenseRow } from '../components/expenses/ExpenseRow';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseDetailModal } from '../components/expenses/ExpenseDetailModal';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ExpenseRowSkeleton } from '../components/ui/Skeleton';
import { GlassCard } from '../components/ui/GlassCard';
import { ScrollReveal } from '../components/ui/ScrollReveal';
import type { Expense } from '../lib/types';

export function Expenses() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['expenses', { categoryId, q: debouncedSearch }],
    queryFn: ({ pageParam }) =>
      getExpenses({
        cursor: pageParam ?? undefined,
        limit: 20,
        category_id: categoryId ?? undefined,
        q: debouncedSearch || undefined,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
  });

  const expenses = data?.pages.flatMap((page) => page.items) ?? [];

  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: async (_, deletedId) => {
      onExpenseDeleted(qc, deletedId);
      await invalidateAllExpenseData(qc);
      setSelectedExpense(null);
      toast.success('Expense deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this expense?')) deleteMut.mutate(id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:px-8 space-y-6">
      {/* Header with ScrollReveal */}
      <ScrollReveal direction="down" duration={0.5}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Expenses Ledger
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Detailed breakdown of all recorded expenditures
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-xs font-semibold text-violet-300 backdrop-blur-md shadow-[0_0_15px_rgba(124,58,237,0.15)] self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} loaded
          </div>
        </div>
      </ScrollReveal>

      {/* Filters with ScrollReveal */}
      <ScrollReveal direction="up" delay={0.1}>
        <div className="glass-3d p-4 rounded-2xl space-y-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="expense-search"
              className="input-glass"
              style={{ paddingLeft: '2.75rem', paddingRight: '2rem' }}
              placeholder="Search expenses by item or notes…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategoryId(null)}
              className={`badge flex-shrink-0 cursor-pointer transition-all duration-200 ${
                categoryId === null
                  ? 'bg-gradient-to-r from-violet-600/40 to-cyan-500/40 text-violet-700 dark:text-white border border-violet-400/50 shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setCategoryId((prev) => (prev === cat.id ? null : cat.id))
                }
                className={`badge flex-shrink-0 cursor-pointer transition-all duration-200 ${
                  categoryId === cat.id
                    ? 'border shadow-[0_0_12px_rgba(124,58,237,0.25)]'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
                style={
                  categoryId === cat.id
                    ? {
                        background: `${cat.color}25`,
                        borderColor: `${cat.color}80`,
                        color: cat.color,
                      }
                    : undefined
                }
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* List */}
      <AnimatePresence mode="popLayout">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ExpenseRowSkeleton key={i} />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">🔍</span>
              <p className="text-slate-400 text-sm">No expenses match your filters</p>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <motion.div key="list" className="space-y-2">
              {expenses.map((e, i) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  delay={i < 10 ? i * 0.03 : 0}
                  onClick={(exp) => setSelectedExpense(exp)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </motion.div>

            {hasNextPage && (
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="glass px-6 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:border-violet-500/50 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isFetchingNextPage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading more…</span>
                    </>
                  ) : (
                    <span>Load more expenses</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Expense Detail View Modal */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        onEdit={(exp) => {
          setSelectedExpense(null);
          handleEdit(exp);
        }}
        onDelete={(id) => handleDelete(id)}
      />

      {/* Edit bottom sheet */}
      <BottomSheet
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingExpense(null);
        }}
        title="Edit Expense"
      >
        <ExpenseForm
          expense={editingExpense}
          onSuccess={() => {
            setEditOpen(false);
            setEditingExpense(null);
          }}
        />
      </BottomSheet>
    </div>
  );
}
