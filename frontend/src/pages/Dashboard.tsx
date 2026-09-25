import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import {
  getStatsSummary,
  getStatsByCategory,
  getExpenses,
  getExpiringExpenses,
  deleteExpense,
  invalidateAllExpenseData,
  onExpenseDeleted,
} from '../lib/api';
import { daysUntil } from '../lib/utils';
import type { Expense } from '../lib/types';
import { StatCard } from '../components/ui/StatCard';
import { StatCardSkeleton, ExpenseRowSkeleton } from '../components/ui/Skeleton';
import { CategoryDonut } from '../components/charts/CategoryDonut';
import { TrendArea } from '../components/charts/TrendArea';
import { ExpenseRow } from '../components/expenses/ExpenseRow';
import { GlassCard } from '../components/ui/GlassCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseDetailModal } from '../components/expenses/ExpenseDetailModal';
import {
  DashboardFilter,
  computeFilterValue,
  type DashboardFilterValue,
} from '../components/dashboard/DashboardFilter';
import { Hero3DCard } from '../components/3d/Hero3DCard';
import { ScrollReveal3D } from '../components/ui/ScrollReveal3D';
import { StickyQuickBar } from '../components/ui/StickyQuickBar';
import { FloatingLiveBeacon } from '../components/ui/FloatingElements';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<DashboardFilterValue>(() =>
    computeFilterValue('month'),
  );

  // Detail Modal & Edit Sheet State
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // 1. Summary Query
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['stats', 'summary', { start: filter.start_date, end: filter.end_date }],
    queryFn: () =>
      getStatsSummary({
        start_date: filter.start_date,
        end_date: filter.end_date,
      }),
  });

  // 2. Categories Query
  const { data: byCategory = [], isLoading: loadingCat } = useQuery({
    queryKey: ['stats', 'by-category', { start: filter.start_date, end: filter.end_date }],
    queryFn: () =>
      getStatsByCategory({
        start_date: filter.start_date,
        end_date: filter.end_date,
      }),
  });

  // 3. Filtered Expenses List for Dashboard
  const { data: expenses = [], isLoading: loadingRecent } = useQuery({
    queryKey: ['expenses', 'dashboard', { start: filter.start_date, end: filter.end_date }],
    queryFn: () =>
      getExpenses({
        limit: 10,
        start_date: filter.start_date,
        end_date: filter.end_date,
      }),
    select: (data) => data.items,
  });

  // 4. Expiring soon
  const { data: expiring = [] } = useQuery({
    queryKey: ['expenses', 'expiring'],
    queryFn: () => getExpiringExpenses(7),
  });

  // Delete Mutation with immediate multi-query invalidation
  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: async (_, deletedId) => {
      onExpenseDeleted(qc, deletedId);
      await invalidateAllExpenseData(qc);
      toast.success('Expense deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDelete = (id: number) => {
    deleteMut.mutate(id);
  };

  const handleEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setEditOpen(true);
  };

  // Calculate daily average for the active period
  const durationDays = Math.max(
    1,
    Math.round(
      (new Date(filter.end_date).getTime() - new Date(filter.start_date).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1,
  );
  const dailyAverage = summary ? Math.round(summary.total_paise / durationDays) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:px-8 space-y-10">
      {/* ─── Sticky Quick Capsule Header on Scroll ───────────────────── */}
      <StickyQuickBar
        totalPaise={summary?.total_paise ?? 0}
        periodLabel={filter.label}
      />

      {/* ─── 1. Enterprise Hero Card with 3D Holographic Portal ─────── */}
      <ScrollReveal3D direction="down" duration={0.65}>
        <div className="glass-3d rounded-3xl p-6 lg:p-8 relative overflow-hidden border border-slate-200/80 dark:border-white/[0.12] shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          {/* Ambient Lighting Gradient */}
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-35 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #7C3AED 0%, #06B6D4 70%, transparent 100%)',
            }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Content Column: Live Status, Greeting, Date Filter */}
            <div className="lg:col-span-7 space-y-4">
              <FloatingLiveBeacon />

              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-inter">
                  {format(new Date(), 'EEEE, d MMMM yyyy')}
                </p>
                <h1
                  className="text-3xl lg:text-4xl font-extrabold mt-1 text-white tracking-tight"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {greeting()} 👋
                </h1>
                <p className="text-slate-400 text-sm mt-1.5 font-inter">
                  Real-time spending overview for{' '}
                  <span className="text-violet-400 font-semibold">{filter.label}</span>
                </p>
              </div>

              {/* Date Filter Pills */}
              <div className="pt-2">
                <DashboardFilter value={filter} onChange={setFilter} />
              </div>
            </div>

            {/* Right Column: 3D Revolving Titanium Smart Card */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <Hero3DCard dailyBurnPaise={dailyAverage} />
            </div>
          </div>
        </div>
      </ScrollReveal3D>

      {/* ─── 2. Metric Stat Cards with 3D Perspective & Glare ───────── */}
      <ScrollReveal3D direction="up" delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {loadingSummary ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Total Spend"
                value={summary?.total_paise ?? 0}
                format="inr"
                icon={<ShoppingCart size={18} />}
                trend={summary?.vs_last_month_paise}
                trendLabel="vs previous period"
                gradient="linear-gradient(135deg,#7C3AED,#06B6D4)"
              />
              <StatCard
                label="Items Purchased"
                value={summary?.item_count ?? 0}
                format="count"
                icon={<Package size={18} />}
                gradient="linear-gradient(135deg,#EC4899,#F59E0B)"
              />
              <StatCard
                label="Daily Average"
                value={dailyAverage}
                format="inr"
                icon={<TrendingUp size={18} />}
                gradient="linear-gradient(135deg,#10B981,#06B6D4)"
              />
            </>
          )}
        </div>
      </ScrollReveal3D>

      {/* ─── 3. Charts Row with 3D Perspective Scroll Reveal ─────────── */}
      <ScrollReveal3D direction="up" delay={0.15}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loadingCat ? (
            <div className="skeleton h-72 rounded-2xl" />
          ) : (
            <CategoryDonut
              data={byCategory}
              totalPaise={summary?.total_paise ?? 0}
            />
          )}
          <TrendArea
            startDate={filter.start_date}
            endDate={filter.end_date}
          />
        </div>
      </ScrollReveal3D>

      {/* ─── 4. Expiring Soon 3D Scroll Reveal ───────────────────────── */}
      {expiring.length > 0 && (
        <ScrollReveal3D direction="up" delay={0.2}>
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-amber-400" />
              <h3
                className="font-semibold text-white"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Expiring Soon
              </h3>
              <span className="badge bg-amber-500/15 text-amber-400">
                {expiring.length}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {expiring.map((exp) => {
                const days = exp.expiry_date ? daysUntil(exp.expiry_date) : 0;
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExpense(exp)}
                    className="glass-3d p-3.5 rounded-xl flex-shrink-0 min-w-[180px] border border-amber-500/20 cursor-pointer hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{exp.category?.icon || '📦'}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {exp.item}
                        </p>
                        <p className="text-[11px] text-amber-400 font-medium">
                          {days === 0
                            ? 'Expires today'
                            : days < 0
                            ? `Expired ${Math.abs(days)}d ago`
                            : `In ${days} days`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </ScrollReveal3D>
      )}

      {/* ─── 5. Expenses in Selected Period with 3D Perspective Reveal ── */}
      <ScrollReveal3D direction="up" delay={0.25}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="font-semibold text-white text-base"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Expenses ({filter.label})
            </h3>
            <p className="text-xs text-slate-500">
              Tap any expense to view full details
            </p>
          </div>
          <Link
            to="/expenses"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all →
          </Link>
        </div>

        <div className="space-y-2">
          {loadingRecent ? (
            Array.from({ length: 4 }).map((_, i) => <ExpenseRowSkeleton key={i} />)
          ) : expenses.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <span className="text-4xl">🧾</span>
              <p className="text-white font-medium text-sm">
                No expenses found for {filter.label}
              </p>
              <p className="text-slate-400 text-xs max-w-sm">
                Try selecting another time period above or record a new expense.
              </p>
              <Link to="/add" className="btn-primary text-xs px-4 py-2 mt-1">
                Add an expense
              </Link>
            </GlassCard>
          ) : (
            expenses.map((e, i) => (
              <div
                key={e.id}
                onClick={() => setSelectedExpense(e)}
                className="cursor-pointer"
              >
                <ExpenseRow
                  expense={e}
                  delay={i * 0.04}
                  onEdit={() => handleEdit(e)}
                  onDelete={() => {
                    if (window.confirm(`Delete "${e.item}"?`)) {
                      handleDelete(e.id);
                    }
                  }}
                />
              </div>
            ))
          )}
        </div>
      </ScrollReveal3D>

      {/* Expense Detail View (Modal on desktop, Bottom Sheet on mobile) */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        onEdit={(exp) => handleEdit(exp)}
        onDelete={(id) => handleDelete(id)}
      />

      {/* Edit Form Sheet */}
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
