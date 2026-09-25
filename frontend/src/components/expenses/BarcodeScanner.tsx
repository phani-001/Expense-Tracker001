import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Loader2, ScanLine, AlertTriangle, Upload, PenLine, Camera } from 'lucide-react';
import { scanBarcode, lookupBarcode } from '../../lib/api';
import type { BarcodeScanResponse, ScanPrefill } from '../../lib/types';

interface BarcodeScannerProps {
  /** Called when a barcode is resolved (product found or not). */
  onResult: (prefill: ScanPrefill) => void;
  /** Called when the user cancels. */
  onClose: () => void;
}

type ScannerState = 'starting' | 'scanning' | 'processing' | 'error';

/**
 * Capture a frame from `video`.
 * If `centerOnly` is true, crops the center 60% of the frame where the
 * viewfinder box is positioned, making small barcodes much larger and sharper.
 */
async function captureFrame(
  video: HTMLVideoElement,
  centerOnly = false,
): Promise<Blob | null> {
  if (video.readyState < 2 || video.videoWidth === 0) return null;

  const canvas = document.createElement('canvas');
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (centerOnly) {
    const cropW = Math.round(vw * 0.7);
    const cropH = Math.round(vh * 0.7);
    const cropX = Math.round((vw - cropW) / 2);
    const cropY = Math.round((vh - cropH) / 2);

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  } else {
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
  }

  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  );
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const [scannerState, setScannerState] = useState<ScannerState>('starting');
  const [statusMessage, setStatusMessage] = useState('Starting camera…');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  /** Stop the camera stream and detach from the video element. */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  const handleManualEntry = useCallback(() => {
    stopCamera();
    onResult({ item: null, barcode: '', brand: null, category: null });
  }, [onResult, stopCamera]);

  const handleProcessScanResult = useCallback(
    (result: BarcodeScanResponse) => {
      if (result.found && result.barcode) {
        if (result.name) {
          toast.success(`Found: ${result.name}`);
          onResult({
            item: result.name,
            barcode: result.barcode,
            brand: result.brand,
            category: result.category,
            quantity: result.quantity,
          });
        } else {
          toast(`Barcode ${result.barcode} detected — enter details manually.`, {
            icon: '🔍',
          });
          onResult({
            item: null,
            barcode: result.barcode,
            brand: null,
            category: null,
          });
        }
      } else {
        toast('No barcode detected. Opening manual form.', { icon: '📝' });
        onResult({ item: null, barcode: '', brand: null, category: null });
      }
    },
    [onResult],
  );

  /** Manual capture trigger (user taps viewfinder or button) */
  const handleManualCapture = async () => {
    if (!videoRef.current || isProcessing) return;
    setIsProcessing(true);
    setStatusMessage('Scanning frame with AI…');

    try {
      const blob = await captureFrame(videoRef.current, false);
      if (blob) {
        const result = await scanBarcode(blob);
        if (result.found && result.barcode) {
          stopCamera();
          handleProcessScanResult(result);
          return;
        }
      }
      toast('No barcode found in current view. Adjust distance or try uploading.', {
        icon: '⚠️',
      });
      setStatusMessage('Point at a barcode');
    } catch {
      toast.error('Scan failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannerState('processing');
    setStatusMessage('Scanning uploaded image…');
    stopCamera();

    try {
      const result = await scanBarcode(file);
      handleProcessScanResult(result);
    } catch {
      toast.error('Could not process image — opening manual form.');
      handleManualEntry();
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let scanActive = true;
    let inFlight = false;
    let tickCount = 0;

    // Check for native browser BarcodeDetector API (instant hardware accelerated decode)
    let nativeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector();
      } catch {
        nativeDetector = null;
      }
    }

    async function tick() {
      if (!scanActive || !mountedRef.current || inFlight) {
        if (scanActive) setTimeout(tick, 300);
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (scanActive) setTimeout(tick, 300);
        return;
      }

      // 1. First try native BarcodeDetector if available (instant local check)
      if (nativeDetector) {
        try {
          const detected = await nativeDetector.detect(video);
          if (detected && detected.length > 0 && scanActive && mountedRef.current) {
            const rawCode = detected[0].rawValue;
            if (rawCode) {
              scanActive = false;
              setScannerState('processing');
              setStatusMessage(`Found ${rawCode} — fetching product info…`);
              stopCamera();

              // Lookup product details via server
              try {
                const info = await lookupBarcode(rawCode);
                toast.success(`Found: ${info.name}`);
                onResult({
                  item: info.name,
                  barcode: info.barcode,
                  brand: info.brand,
                  category: info.category,
                });
              } catch {
                toast(`Barcode ${rawCode} detected — enter details manually.`, {
                  icon: '🔍',
                });
                onResult({
                  item: null,
                  barcode: rawCode,
                  brand: null,
                  category: null,
                });
              }
              return;
            }
          }
        } catch {
          // Native detector error — proceed to server scan
        }
      }

      // 2. Server-side zxing-cpp decode
      // Alternate between center crop and full frame for maximum detection
      tickCount++;
      const useCenterCrop = tickCount % 2 === 1;

      const blob = await captureFrame(video, useCenterCrop);
      if (!blob || !scanActive || !mountedRef.current) {
        if (scanActive) setTimeout(tick, 300);
        return;
      }

      inFlight = true;
      try {
        const result = await scanBarcode(blob);
        if (!scanActive || !mountedRef.current) return;

        if (result.found && result.barcode) {
          scanActive = false;
          setScannerState('processing');
          setStatusMessage(`Found ${result.barcode} — fetching info…`);
          stopCamera();
          handleProcessScanResult(result);
          return;
        }
      } catch {
        // Continue scanning silently on frame misses
      } finally {
        inFlight = false;
        if (scanActive) setTimeout(tick, 300);
      }
    }

    async function startCamera() {
      if (!videoRef.current) return;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            'Camera access requires HTTPS or localhost. You can upload an image instead.',
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Attempt continuous focus if available on the track
        try {
          const track = stream.getVideoTracks()[0];
          if (track && 'applyConstraints' in track) {
            const caps: any = (track as any).getCapabilities?.() || {};
            if (caps.focusMode?.includes('continuous')) {
              await (track as any).applyConstraints({
                advanced: [{ focusMode: 'continuous' }],
              });
            }
          }
        } catch {
          // Ignore focus constraint failure
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (mountedRef.current) {
          setScannerState('scanning');
          setStatusMessage('Point camera at barcode');
          setTimeout(tick, 400);
        }
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const msg =
          err instanceof Error ? err.message : 'Camera access denied or unavailable';
        setErrorMsg(msg);
        setScannerState('error');
      }
    }

    startCamera();

    return () => {
      mountedRef.current = false;
      scanActive = false;
      stopCamera();
    };
  }, [handleProcessScanResult, onResult, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe pt-4">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <span
            className="text-white font-bold text-xl"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Scan Barcode
          </span>
          <span className="text-white/70 text-xs mt-0.5">{statusMessage}</span>
        </motion.div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-white text-xs font-medium hover:bg-white/25 transition-colors"
            title="Upload barcode image"
          >
            <Upload size={14} />
            Upload
          </button>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Viewfinder */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center cursor-pointer"
        onClick={handleManualCapture}
        title="Tap to scan this frame"
      >
        {scannerState === 'scanning' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-80 h-52"
          >
            {/* Corner brackets */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <div
                key={corner}
                className={`absolute w-8 h-8 border-violet-400 ${
                  corner === 'tl'
                    ? 'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl'
                    : corner === 'tr'
                    ? 'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl'
                    : corner === 'bl'
                    ? 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl'
                    : 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'
                }`}
              />
            ))}

            {/* Animated scan line */}
            <motion.div
              className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent"
              style={{ boxShadow: '0 0 10px 2px rgba(139,92,246,0.8)' }}
              animate={{ top: ['10%', '88%', '10%'] }}
              transition={{ duration: 2.0, ease: 'linear', repeat: Infinity }}
            />

            {/* Tap to scan badge */}
            <div className="absolute -bottom-8 inset-x-0 text-center">
              <span className="text-white/60 text-[11px] bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                Align barcode inside frame \u00b7 Tap to scan
              </span>
            </div>
          </motion.div>
        )}

        {(scannerState === 'starting' || scannerState === 'processing') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 text-center px-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              {scannerState === 'starting' ? (
                <ScanLine size={28} className="text-violet-400" />
              ) : (
                <Loader2 size={28} className="text-violet-400 animate-spin" />
              )}
            </div>
            <p className="text-white/90 text-sm font-medium">{statusMessage}</p>
          </motion.div>
        )}

        <AnimatePresence>
          {scannerState === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-6 mx-6 flex flex-col items-center gap-4 text-center max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle size={26} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Camera unavailable</p>
                <p className="text-slate-400 text-xs mt-1.5">{errorMsg}</p>
              </div>

              <div className="flex flex-col w-full gap-2 mt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                >
                  <Upload size={16} />
                  Upload barcode photo
                </button>
                <button
                  onClick={handleManualEntry}
                  className="btn-ghost w-full flex items-center justify-center gap-2 py-2.5 text-slate-300"
                >
                  <PenLine size={16} />
                  Enter manually
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom control bar */}
      <div className="relative z-10 flex items-center justify-around px-6 py-5 pb-safe bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <Upload size={18} />
          </div>
          <span className="text-[11px]">Upload Photo</span>
        </button>

        <button
          onClick={handleManualCapture}
          disabled={scannerState !== 'scanning' || isProcessing}
          className="flex flex-col items-center gap-1.5 text-white hover:scale-105 transition-all disabled:opacity-40"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 shadow-lg shadow-violet-500/30 flex items-center justify-center">
            {isProcessing ? (
              <Loader2 size={22} className="animate-spin text-white" />
            ) : (
              <Camera size={24} className="text-white" />
            )}
          </div>
          <span className="text-[11px] font-medium text-violet-300">Scan Now</span>
        </button>

        <button
          onClick={handleManualEntry}
          className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <PenLine size={18} />
          </div>
          <span className="text-[11px]">Manual Entry</span>
        </button>
      </div>

      {/* Hidden file input for uploading barcode image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
