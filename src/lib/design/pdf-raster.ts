export const MAX_RASTER_PX = 4096;

export interface Downscale {
  width: number;
  height: number;
  scale: number;
}

/** Pure: scale factor so the longest side is <= MAX_RASTER_PX (never upscales). */
export function computeDownscale(width: number, height: number, max: number = MAX_RASTER_PX): Downscale {
  if (!(width > 0) || !(height > 0)) throw new Error('Invalid dimensions');
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height), scale: 1 };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale), scale };
}

export interface PdfRasterResult {
  blob: Blob;
  width: number;
  height: number;
  page: number;
  pageCount: number;
}

/**
 * Renders one PDF page (default 1) to a WebP blob. pdfjs-dist is imported lazily,
 * only on first PDF. The caller shows a page picker when pageCount > 1 and calls again.
 */
export async function rasterizePdf(data: ArrayBuffer | Uint8Array, page = 1): Promise<PdfRasterResult> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const pageCount = pdf.numPages;
    const n = Math.min(Math.max(1, Math.floor(page)), pageCount);
    const p = await pdf.getPage(n);
    const base = p.getViewport({ scale: 1 });
    const { width, height, scale } = computeDownscale(base.width * 2, base.height * 2);
    const viewport = p.getViewport({ scale: 2 * scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    await p.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('WebP encode failed'))), 'image/webp', 0.92)
    );
    return { blob, width: canvas.width || width, height: canvas.height || height, page: n, pageCount };
  } finally {
    await pdf.destroy();
  }
}
