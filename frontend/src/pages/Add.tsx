import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ScanLine, ImagePlus, PenLine, ArrowLeft } from 'lucide-react';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { BarcodeScanner } from '../components/expenses/BarcodeScanner';
import { PhotoCapture } from '../components/expenses/PhotoCapture';
import type { ScanPrefill, PhotoPrefill } from '../lib/types';

type Method = 'manual' | 'scan' | 'photo';

const METHODS: {
  id: Method;
  icon: React.ReactNode;
  label: string;
  description: string;
  available: boolean;
}[] = [
  {
    id: 'scan',
    icon: <ScanLine size={28} />,
    label: 'Scan Barcode',
    description: 'Camera live scan',
    available: true,
  },
  {
    id: 'photo',
    icon: <ImagePlus size={28} />,
    label: 'Photo / Receipt',
    description: 'AI extraction',
    available: true,
  },
  {
    id: 'manual',
    icon: <PenLine size={28} />,
    label: 'Manual Entry',
    description: 'Fill in details',
    available: true,
  },
];

type FormPrefillData = {
  item?: string;
  barcode?: string;
  price?: number;
  quantity?: number;
  category?: string;
  expiry_date?: string;
  purchase_date?: string;
  source: 'scan' | 'photo' | 'manual';
};

export function Add() {
  const [method, setMethod] = useState<Method | null>(null);
  const [scanPrefill, setScanPrefill] = useState<ScanPrefill | null>(null);
  const [photoPrefill, setPhotoPrefill] = useState<PhotoPrefill | null>(null);
  const navigate = useNavigate();

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const } },
  };

  const resetState = () => {
    setMethod(null);
    setScanPrefill(null);
    setPhotoPrefill(null);
  };

  // ── Scan: full-screen camera overlay ────────────────────────────────────
  if (method === 'scan' && scanPrefill === null) {
    return (
      <BarcodeScanner
        onResult={(prefill) => setScanPrefill(prefill)}
        onClose={() => setMethod(null)}
      />
    );
  }

  // ── Photo: full-screen photo capture ────────────────────────────────────
  if (method === 'photo' && photoPrefill === null) {
    return (
      <PhotoCapture
        onResult={(prefill) => setPhotoPrefill(prefill)}
        onClose={() => setMethod(null)}
      />
    );
  }

  // ── Review form (manual, after scan, or after photo) ─────────────────────
  const showForm =
    method === 'manual' ||
    (method === 'scan' && scanPrefill !== null) ||
    (method === 'photo' && photoPrefill !== null);

  if (showForm) {
    const subtitle =
      method === 'scan' ? 'Review & save' :
      method === 'photo' ? 'Review extracted details' :
      'Manual entry';

    // Build unified prefill for ExpenseForm
    let formPrefill: FormPrefillData | undefined;
    if (method === 'scan' && scanPrefill) {
      formPrefill = {
        item: scanPrefill.item ?? undefined,
        barcode: scanPrefill.barcode,
        quantity: scanPrefill.quantity ?? undefined,
        category: scanPrefill.category ?? undefined,
        source: 'scan',
      };
    } else if (method === 'photo' && photoPrefill) {
      formPrefill = {
        item: photoPrefill.item ?? undefined,
        price: photoPrefill.price ?? undefined,
        quantity: photoPrefill.quantity ?? undefined,
        category: photoPrefill.category ?? undefined,
        expiry_date: photoPrefill.expiry_date ?? undefined,
        purchase_date: photoPrefill.purchase_date ?? undefined,
        source: 'photo',
      };
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <button onClick={resetState} className="btn-ghost p-2 rounded-xl">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Add Expense
            </h1>
            <p className="text-slate-400 text-sm">{subtitle}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass p-6"
        >
          <ExpenseForm prefill={formPrefill} onSuccess={() => navigate('/')} />
        </motion.div>
      </div>
    );
  }

  // ── Method picker ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Add Expense
          </h1>
          <p className="text-slate-400 text-sm">Choose how to capture</p>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4"
      >
        {METHODS.map(({ id, icon, label, description, available }) => (
          <motion.button
            key={id}
            variants={cardVariants}
            onClick={() => available && setMethod(id)}
            disabled={!available}
            whileHover={available ? { scale: 1.015, y: -2 } : undefined}
            whileTap={available ? { scale: 0.99 } : undefined}
            className={`glass p-6 flex items-center gap-5 text-left transition-all duration-300 ${
              available
                ? 'cursor-pointer hover:shadow-glass-hover hover:border-violet-500/30'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
              style={{
                background:
                  id === 'scan'
                    ? 'linear-gradient(135deg,#7C3AED,#06B6D4)'
                    : id === 'photo'
                    ? 'linear-gradient(135deg,#EC4899,#F59E0B)'
                    : 'linear-gradient(135deg,#10B981,#06B6D4)',
              }}
            >
              {icon}
            </div>

            <div className="flex-1">
              <p
                className="text-white font-semibold text-lg"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {label}
              </p>
              <p className="text-slate-400 text-sm mt-0.5">{description}</p>
            </div>

            {available && (
              <motion.div
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
                className="text-violet-400 text-xl"
              >
                →
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
