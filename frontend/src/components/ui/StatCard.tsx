import type { ReactNode } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { TiltCard3D } from './TiltCard3D';
import { formatINR } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  format?: 'inr' | 'count';
  trend?: number | null; // paise delta or count delta
  trendLabel?: string;
  gradient?: string;
}

export function StatCard({
  label,
  value,
  icon,
  format = 'inr',
  trend,
  trendLabel,
  gradient,
}: StatCardProps) {
  const trendPositive = (trend ?? 0) > 0;
  const trendNeutral = (trend ?? 0) === 0;

  return (
    <TiltCard3D maxTilt={9} className="p-6 cursor-default group overflow-hidden border-glow-card">
      {/* 3D Depth Layer 1: Ambient Backdrop Light */}
      <div
        className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-40"
        style={{
          background: gradient ?? 'linear-gradient(135deg,#7C3AED,#06B6D4)',
        }}
      />

      {/* 3D Depth Layer 2: Label & Floating Icon */}
      <div className="flex items-center justify-between depth-pop-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-inter">
          {label}
        </span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg depth-pop-md transition-transform duration-300 group-hover:scale-110"
          style={{
            background: gradient ?? 'linear-gradient(135deg,#7C3AED,#06B6D4)',
            boxShadow: '0 4px 20px -2px rgba(124, 58, 237, 0.4)',
          }}
        >
          {icon}
        </div>
      </div>

      {/* 3D Depth Layer 3: Main Value with 3D Pop & Tabular Numerals */}
      <div
        className="text-3xl font-extrabold text-white mt-4 leading-none depth-pop-lg tnum tracking-tight"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        {format === 'inr' ? (
          <AnimatedNumber value={value} format={(n) => formatINR(n)} />
        ) : (
          <AnimatedNumber value={value} format={(n) => n.toLocaleString('en-IN')} />
        )}
      </div>

      {/* 3D Depth Layer 4: Trend Badge */}
      {trend !== undefined && trend !== null && (
        <div className="flex items-center gap-2 mt-4 depth-pop-sm">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md ${
              trendNeutral
                ? 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600/40'
                : trendPositive
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {trendNeutral ? '—' : trendPositive ? '↑' : '↓'}{' '}
            {format === 'inr'
              ? formatINR(Math.abs(trend))
              : Math.abs(trend).toLocaleString()}
          </span>
          {trendLabel && (
            <span className="text-xs text-slate-400 font-medium">{trendLabel}</span>
          )}
        </div>
      )}
    </TiltCard3D>
  );
}
