/**
 * Client-side image resizer using Canvas.
 *
 * Scales the image down so that neither dimension exceeds `maxPx`,
 * then reduces JPEG quality until the blob is under `maxBytes`.
 *
 * Returns a JPEG Blob ready to upload.
 */

export async function resizeImage(
  file: File,
  maxPx = 1280,
  maxBytes = 1_000_000,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // Scale factor to fit within maxPx on the longest side
  const scale = Math.min(1, maxPx / Math.max(origW, origH));
  const w = Math.round(origW * scale);
  const h = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // Reduce quality until size is under maxBytes
  for (let quality = 0.9; quality >= 0.5; quality -= 0.1) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= maxBytes) return blob;
  }

  // Last resort — minimum quality
  return canvasToBlob(canvas, 'image/jpeg', 0.5);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      type,
      quality,
    );
  });
}
