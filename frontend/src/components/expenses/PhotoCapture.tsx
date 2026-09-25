import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, ImagePlus, Sparkles, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { resizeImage } from '../../lib/resize';
import { extractImage } from '../../lib/api';
import type { PhotoPrefill } from '../../lib/types';

interface PhotoCaptureProps {
  onResult: (prefill: PhotoPrefill) => void;
  onClose: () => void;
}

type CaptureState = 'idle' | 'resizing' | 'extracting' | 'done' | 'error';

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' :
    pct >= 50 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
                'text-red-400 bg-red-500/15 border-red-500/30';
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>
      <CheckCircle2 size={11} />
      {pct}% confidence
    </span>
  );
}

export function PhotoCapture({ onResult, onClose }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<CaptureState>('idle');
  const [sizeInfo, setSizeInfo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSizeInfo(`${(f.size / 1024).toFixed(0)} KB original`);
    setState('idle');
  };

  const handleAnalyse = async () => {
    if (!file) return;
    setState('resizing');

    let blob: Blob;
    try {
      blob = await resizeImage(file);
      setSizeInfo(`${(blob.size / 1024).toFixed(0)} KB after resize`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Resize failed');
      setState('error');
      return;
    }

    setState('extracting');
    let result: Awaited<ReturnType<typeof extractImage>>;
    try {
      result = await extractImage(blob);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Extraction failed');
      setState('error');
      return;
    }

    setState('done');

    const allNull = Object.values(result).every((v) => v === null);
    if (allNull) {
      toast("Couldn't extract details — please fill in manually.", { icon: '📝' });
    } else {
      const conf = result.confidence;
      toast.success(
        conf != null
          ? `Extracted at ${Math.round(conf * 100)}% confidence`
          : 'Fields extracted — please review',
      );
    }

    onResult(result);
  };

  const isProcessing = state === 'resizing' || state === 'extracting';
  const stateLabel =
    state === 'resizing' ? 'Resizing image…' :
    state === 'extracting' ? 'AI analysing…' :
    state === 'done' ? 'Done' : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#08091a]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-5 pb-4">
        <div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Photo / Receipt
          </h1>
          <p className="text-slate-500 text-sm">AI-powered extraction</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-5">

        {/* File picker / preview area */}
        <AnimatePresence mode="wait">
          {!preview ? (
            <motion.button
              key="picker"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => inputRef.current?.click()}
              className="glass flex flex-col items-center justify-center gap-4 py-16 text-center border-dashed cursor-pointer hover:border-violet-500/40 transition-colors"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#EC4899,#F59E0B)' }}
              >
                <ImagePlus size={28} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Take or choose a photo
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Receipt, product label, or shelf tag
                </p>
              </div>
            </motion.button>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden border border-white/10"
            >
              <img
                src={preview}
                alt="Selected photo"
                className="w-full max-h-72 object-contain bg-black"
              />
              {/* Overlay "Change" button */}
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
                className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm border border-white/15 text-white text-xs px-3 py-1.5 rounded-full hover:bg-black/80 transition-colors disabled:opacity-40"
              >
                Change photo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Size info */}
        {sizeInfo && (
          <p className="text-xs text-slate-500 text-center -mt-2">{sizeInfo}</p>
        )}

        {/* Error state */}
        <AnimatePresence>
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass p-4 flex items-center gap-3 border-red-500/20"
            >
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium text-sm">Extraction failed</p>
                <p className="text-slate-500 text-xs">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing status */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass p-4 flex items-center gap-3"
            >
              <Loader2 size={18} className="text-violet-400 animate-spin flex-shrink-0" />
              <p className="text-slate-300 text-sm">{stateLabel}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info card */}
        {!preview && !isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass p-4 text-sm text-slate-400 space-y-1.5"
          >
            <p className="flex items-center gap-2">
              <Sparkles size={14} className="text-violet-400 flex-shrink-0" />
              Extracts item name, price, quantity, category &amp; dates
            </p>
            <p className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400 flex-shrink-0" />
              Always review before saving — AI can make mistakes
            </p>
            <p className="flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400 flex-shrink-0" />
              Image resized to ≤ 1280px before upload
            </p>
          </motion.div>
        )}

        {/* CTA */}
        {preview && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="btn-primary w-full h-12 text-base mt-auto"
            onClick={handleAnalyse}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {stateLabel}
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Analyse with AI
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Hidden file input — capture="environment" prefers rear camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export { ConfidenceBadge };
