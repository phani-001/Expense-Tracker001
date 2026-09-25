import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Filter,
  CalendarRange,
} from 'lucide-react';
import {
  format,
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';

export type FilterPreset =
  | 'today'
  | 'week'
  | 'month'
  | 'year'
  | 'custom_month'
  | 'custom_range';

export interface DashboardFilterValue {
  type: FilterPreset;
  label: string;
  start_date: string;
  end_date: string;
  month?: string;
}

interface DashboardFilterProps {
  value: DashboardFilterValue;
  onChange: (value: DashboardFilterValue) => void;
}

export function computeFilterValue(
  type: FilterPreset,
  extra?: { customMonth?: string; startDate?: string; endDate?: string },
): DashboardFilterValue {
  const now = new Date();

  switch (type) {
    case 'today':
      return {
        type: 'today',
        label: 'Today',
        start_date: format(startOfToday(), 'yyyy-MM-dd'),
        end_date: format(endOfToday(), 'yyyy-MM-dd'),
      };
    case 'week':
      return {
        type: 'week',
        label: 'This Week',
        start_date: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end_date: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    case 'month':
      return {
        type: 'month',
        label: format(now, 'MMMM yyyy'),
        month: format(now, 'yyyy-MM'),
        start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'year':
      return {
        type: 'year',
        label: `This Year (${now.getFullYear()})`,
        start_date: format(startOfYear(now), 'yyyy-MM-dd'),
        end_date: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    case 'custom_month': {
      const mStr = extra?.customMonth || format(now, 'yyyy-MM');
      const [y, m] = mStr.split('-').map(Number);
      const target = new Date(y, m - 1, 1);
      return {
        type: 'custom_month',
        label: format(target, 'MMMM yyyy'),
        month: mStr,
        start_date: format(startOfMonth(target), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(target), 'yyyy-MM-dd'),
      };
    }
    case 'custom_range': {
      const s = extra?.startDate || format(startOfMonth(now), 'yyyy-MM-dd');
      const e = extra?.endDate || format(endOfToday(), 'yyyy-MM-dd');
      return {
        type: 'custom_range',
        label: `${format(new Date(s), 'dd MMM')} – ${format(new Date(e), 'dd MMM')}`,
        start_date: s,
        end_date: e,
      };
    }
  }
}

export function DashboardFilter({ value, onChange }: DashboardFilterProps) {
  const [showCustom, setShowCustom] = useState(
    value.type === 'custom_month' || value.type === 'custom_range',
  );
  const [customMonthInput, setCustomMonthInput] = useState(
    value.month || format(new Date(), 'yyyy-MM'),
  );
  const [rangeStart, setRangeStart] = useState(value.start_date);
  const [rangeEnd, setRangeEnd] = useState(value.end_date);

  const presets: { type: FilterPreset; label: string }[] = [
    { type: 'today', label: 'Today' },
    { type: 'week', label: 'This Week' },
    { type: 'month', label: 'This Month' },
    { type: 'year', label: 'This Year' },
  ];

  const handleSelectPreset = (type: FilterPreset) => {
    setShowCustom(false);
    onChange(computeFilterValue(type));
  };

  const handleCustomMonthChange = (mStr: string) => {
    setCustomMonthInput(mStr);
    onChange(computeFilterValue('custom_month', { customMonth: mStr }));
  };

  const handleApplyRange = () => {
    if (rangeStart && rangeEnd) {
      onChange(
        computeFilterValue('custom_range', {
          startDate: rangeStart,
          endDate: rangeEnd,
        }),
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Preset pills row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1 pl-1 flex-shrink-0 font-medium">
          <Filter size={13} className="text-violet-400" />
          <span>Period:</span>
        </div>

        {presets.map(({ type, label }) => {
          const active = value.type === type;
          return (
            <button
              key={type}
              onClick={() => handleSelectPreset(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                active
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-sm shadow-violet-500/25'
                  : 'bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]'
              }`}
            >
              {label}
            </button>
          );
        })}

        {/* Custom trigger pill */}
        <button
          onClick={() => setShowCustom((prev) => !prev)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
            value.type === 'custom_month' || value.type === 'custom_range'
              ? 'bg-violet-600/15 dark:bg-violet-600/30 text-violet-700 dark:text-violet-300 border border-violet-500/40'
              : 'bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]'
          }`}
        >
          <CalendarRange size={12} />
          <span>Custom</span>
          <ChevronDown
            size={12}
            className={`transition-transform ${showCustom ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expandable Custom Pickers */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass p-3.5 rounded-2xl flex flex-wrap items-center gap-3 border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
              {/* Pick a specific month */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Month:</span>
                <input
                  type="month"
                  value={customMonthInput}
                  onChange={(e) => handleCustomMonthChange(e.target.value)}
                  className="bg-white/90 dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-2.5 py-1 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-white/10" />

              {/* Date Range */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Range:</span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="bg-white/90 dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-2 py-1 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-violet-500"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="bg-white/90 dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl px-2 py-1 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleApplyRange}
                  className="btn-primary px-3 py-1 text-xs rounded-xl"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
