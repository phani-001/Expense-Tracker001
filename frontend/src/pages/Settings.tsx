import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Loader2, Zap, Database, Sun, Moon, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCategories, createCategory } from '../lib/api';
import { GlassCard } from '../components/ui/GlassCard';
import { useTheme } from '../lib/theme';

const PRESET_COLORS = [
  '#7C3AED', '#06B6D4', '#EC4899', '#10B981',
  '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6',
];

export function Settings() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newIcon, setNewIcon] = useState('📦');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created!');
      setNewName('');
      setNewIcon('📦');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 lg:px-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1
          className="text-3xl font-bold text-white"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Manage appearance, categories and preferences</p>
      </motion.div>

      {/* Appearance & Theme Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="font-semibold text-white text-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Appearance & Theme
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Select your preferred visual style and interface atmosphere
              </p>
            </div>
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Sparkles size={18} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {/* Dark Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                theme === 'dark'
                  ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_25px_rgba(124,58,237,0.25)]'
                  : 'border-slate-200/80 dark:border-white/[0.08] hover:border-violet-400/40 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400">
                  <Moon size={18} />
                </div>
                {theme === 'dark' && (
                  <span className="badge bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Cyber-Luxe Dark
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Deep obsidian void with neon violet and cyan holographic highlights
              </p>
            </button>

            {/* Light Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                theme === 'light'
                  ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                  : 'border-slate-200/80 dark:border-white/[0.08] hover:border-cyan-400/40 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-500">
                  <Sun size={18} />
                </div>
                {theme === 'light' && (
                  <span className="badge bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Frost & Platinum Light
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Luminous alabaster with frosted pearl cards and obsidian typography
              </p>
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard>
          <h2
            className="font-semibold text-white mb-5"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Categories
          </h2>

          {/* Existing categories */}
          <div className="space-y-2 mb-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                  style={{ background: `${cat.color}22` }}
                >
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-white flex-1">{cat.name}</span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: cat.color }}
                />
              </motion.div>
            ))}
          </div>

          {/* Add new category */}
          <div className="border-t border-white/[0.06] pt-5 space-y-4">
            <p className="text-sm font-medium text-slate-400">Add category</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="input-glass"
                  placeholder="e.g. Fitness"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Icon (emoji)</label>
                <input
                  className="input-glass"
                  placeholder="💪"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Color</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-8 h-8 rounded-full transition-all duration-150"
                    style={{
                      background: c,
                      outline: newColor === c ? `3px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() =>
                newName.trim() &&
                createMut.mutate({ name: newName.trim(), color: newColor, icon: newIcon })
              }
              disabled={!newName.trim() || createMut.isPending}
              className="btn-primary w-full"
            >
              {createMut.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Add Category
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Provider status */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard>
          <h2
            className="font-semibold text-white mb-4"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Providers
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-violet-400" />
                <div>
                  <p className="text-sm font-medium text-white">Groq Vision</p>
                  <p className="text-xs text-slate-500">Photo extraction</p>
                </div>
              </div>
              <span className="badge bg-amber-500/15 text-amber-400">Phase 4</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-white">Open Food Facts</p>
                  <p className="text-xs text-slate-500">Barcode lookup</p>
                </div>
              </div>
              <span className="badge bg-amber-500/15 text-amber-400">Phase 3</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
