import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getStatsTrend } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { GlassCard } from '../ui/GlassCard';
import { ChartSkeleton } from '../ui/Skeleton';
import { motion } from 'framer-motion';

const RANGES = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '12W', value: '12w' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass px-4 py-3 text-sm">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="font-semibold text-white">{formatINR(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

interface TrendAreaProps {
  startDate?: string;
  endDate?: string;
}

export function TrendArea({ startDate, endDate }: TrendAreaProps) {
  const [range, setRange] = useState('30d');

  const queryKey = startDate && endDate
    ? ['trend', { startDate, endDate }]
    : ['trend', range];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      startDate && endDate
        ? getStatsTrend({ start_date: startDate, end_date: endDate })
        : getStatsTrend(range),
  });

  if (isLoading) return <ChartSkeleton />;

  const chartData = (data ?? []).map((p) => ({
    date: p.date,
    value: p.total_paise,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <h3
            className="font-semibold text-white text-base"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Spend Trend
          </h3>
          {!startDate && !endDate && (
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`toggle-btn ${range === r.value ? 'active' : ''}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
            <p>No spending recorded in this period</p>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  stroke="#64748B"
                  fontSize={11}
                  tickFormatter={(v) => {
                    if (v.includes('-W')) return v.replace(/^.*-W/, 'Wk ');
                    const parts = v.split('-');
                    return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : v;
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="#64748B"
                  fontSize={11}
                  tickFormatter={(v) => `₹${Math.round(v / 100)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#A78BFA' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
