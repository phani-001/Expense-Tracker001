import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '../ui/GlassCard';
import { formatINR } from '../../lib/utils';
import type { ByCategoryItem } from '../../lib/types';
import { motion } from 'framer-motion';

const CHART_COLORS = [
  '#7C3AED', '#06B6D4', '#EC4899', '#10B981',
  '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6',
];

interface CategoryDonutProps {
  data: ByCategoryItem[];
  totalPaise: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const item = payload[0];
    return (
      <div className="glass px-4 py-3 text-sm">
        <p className="font-semibold text-white mb-1">{item.name}</p>
        <p className="text-slate-400">{formatINR(item.value)}</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
    {payload?.map((entry: any, i: number) => (
      <div key={i} className="flex items-center gap-2 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: entry.color }}
        />
        <span className="text-xs text-slate-400 truncate">{entry.value}</span>
      </div>
    ))}
  </div>
);

export function CategoryDonut({ data, totalPaise }: CategoryDonutProps) {
  if (!data.length) {
    return (
      <GlassCard>
        <h3 className="font-outfit font-semibold text-white mb-4">By Category</h3>
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
          No expenses in this period
        </div>
      </GlassCard>
    );
  }

  const chartData = data.map((item) => ({
    name: item.category_name,
    value: item.total_paise,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-semibold text-white text-base"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            By Category
          </h3>
          <span className="text-xs text-slate-500">This month</span>
        </div>

        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-500 mb-0.5">Total</span>
            <span
              className="text-base font-bold text-white"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {formatINR(totalPaise)}
            </span>
          </div>
        </div>

        <CustomLegend payload={chartData.map((d, i) => ({ value: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
      </GlassCard>
    </motion.div>
  );
}
