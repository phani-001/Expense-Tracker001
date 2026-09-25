/**
 * Barcode scanner engine.
 *
 * Priority:
 *   1. Native BarcodeDetector (Chrome / Android WebView)
 *   2. @zxing/browser (all other browsers)
 *
 * Usage:
 *   const controls = await startBarcodeScanner(videoEl, (barcode) => { ... });
 *   // later:
 *   controls.stop();
 */

import { BrowserMultiFormatReader } from '@zxing/browser';

export interface ScannerControls {
  stop: () => void;
}

/** Returns true when the browser supports the native BarcodeDetector API. */
function hasNativeBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Start scanning barcodes from a live camera stream rendered in `videoEl`.
 * Calls `onDetected` with the decoded string when a barcode is found.
 * Returns a controls object with a `stop()` method.
 */
export async function startBarcodeScanner(
  videoEl: HTMLVideoElement,
  onDetected: (barcode: string) => void,
): Promise<ScannerControls> {
  if (hasNativeBarcodeDetector()) {
    return _startNative(videoEl, onDetected);
  }
  return _startZXing(videoEl, onDetected);
}

// ---------------------------------------------------------------------------
// Native BarcodeDetector path
// ---------------------------------------------------------------------------

async function _startNative(
  videoEl: HTMLVideoElement,
  onDetected: (barcode: string) => void,
): Promise<ScannerControls> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detector = new (window as any).BarcodeDetector({
    formats: [
      'ean_13', 'ean_8', 'upc_a', 'upc_e',
      'qr_code', 'code_128', 'code_39', 'itf',
    ],
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
  });
  videoEl.srcObject = stream;
  await videoEl.play();

  let active = true;
  let lastCode = '';
  let lastTime = 0;

  const tick = async () => {
    if (!active) return;
    try {
      const barcodes = await detector.detect(videoEl);
      if (barcodes.length > 0) {
        const code: string = barcodes[0].rawValue;
        const now = Date.now();
        // Debounce: same code within 2 s is ignored
        if (code !== lastCode || now - lastTime > 2000) {
          lastCode = code;
          lastTime = now;
          onDetected(code);
        }
      }
    } catch {
      // ignore individual frame errors
    }
    if (active) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    stop() {
      active = false;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    },
  };
}

// ---------------------------------------------------------------------------
// ZXing fallback path
// ---------------------------------------------------------------------------

async function _startZXing(
  videoEl: HTMLVideoElement,
  onDetected: (barcode: string) => void,
): Promise<ScannerControls> {
  const reader = new BrowserMultiFormatReader();

  // getUserMedia first so we can pick the rear camera
  const devices = await BrowserMultiFormatReader.listVideoInputDevices();
  // Prefer back/environment camera by label heuristic
  const rearDevice = devices.find((d) =>
    /back|rear|environment/i.test(d.label),
  );
  const deviceId = rearDevice?.deviceId ?? devices[0]?.deviceId;

  let lastCode = '';
  let lastTime = 0;

  const controls = await reader.decodeFromVideoDevice(
    deviceId,
    videoEl,
    (result) => {
      if (!result) return;
      const code = result.getText();
      const now = Date.now();
      if (code !== lastCode || now - lastTime > 2000) {
        lastCode = code;
        lastTime = now;
        onDetected(code);
      }
    },
  );

  return {
    stop() {
      controls.stop();
    },
  };
}
