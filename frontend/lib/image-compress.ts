import imageCompression from 'browser-image-compression';
import piexif from 'piexifjs';
import { readExifTags, exifTagToDate } from './exif-freshness';

export interface CompressImageOptions {
  maxSizeKB?: number; // Default 280 (guaranteed < 290KB)
  maxWidthOrHeight?: number; // Default 1280
  initialQuality?: number; // Default 0.82
}

const MAX_TARGET_BYTES = 290 * 1024;

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Falha ao converter imagem para data URL.'));
    reader.onerror = () => reject(reader.error || new Error('Erro ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

/** Canvas fallback. Output never carries metadata — dates are injected after. */
async function canvasCompress(
  file: File | Blob,
  maxBytes: number = MAX_TARGET_BYTES,
  mime: string = 'image/webp'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxDim = 1280;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context não suportado.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.8;
      let dataUrl = canvas.toDataURL(mime, quality);
      while (dataUrl.length > maxBytes * 1.33 && quality > 0.15) {
        quality -= 0.15;
        dataUrl = canvas.toDataURL(mime, quality);
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem para compressão.'));
    };

    img.src = url;
  });
}

// Capture timestamps the backend requires: Exif 36867/36868, IFD0 306
// (ModifyDate), plus OffsetTime* 36880-36882 for timezone-aware values.
// piexifjs lacks the offset tags — register once so dump() can pack them.
for (const [tag, name] of [
  [36880, 'OffsetTime'],
  [36881, 'OffsetTimeOriginal'],
  [36882, 'OffsetTimeDigitized'],
] as Array<[number, string]>) {
  const table = piexif.TAGS?.['Exif'];
  if (table && !table[String(tag)]) table[String(tag)] = { name, type: 'Ascii' };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Earliest capture moment + device UTC offset (`±HH:MM`) at that instant. */
function pickCaptureMoment(tags: Record<string, unknown>): {
  dateTime: string;
  offset: string;
} | null {
  let earliest: Date | null = null;
  for (const tag of ['CreateDate', 'DateTimeOriginal', 'ModifyDate']) {
    const candidate = exifTagToDate(tags[tag]);
    if (candidate && (!earliest || candidate < earliest)) earliest = candidate;
  }
  if (!earliest) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateTime =
    `${earliest.getFullYear()}:${pad(earliest.getMonth() + 1)}:${pad(earliest.getDate())} ` +
    `${pad(earliest.getHours())}:${pad(earliest.getMinutes())}:${pad(earliest.getSeconds())}`;
  const minutes = -earliest.getTimezoneOffset();
  const abs = Math.abs(minutes);
  const offset = `${minutes >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return { dateTime, offset };
}

/** Stamp the capture moment (3 equal dates + 3 offsets), keeping other tags. */
function ensureJpegCaptureDates(
  dataUrl: string,
  capture: { dateTime: string; offset: string } | null
): string {
  if (!capture) return dataUrl;
  try {
    let dict: Record<string, Record<string | number, unknown>>;
    try {
      dict = piexif.load(dataUrl);
    } catch {
      dict = {};
    }
    dict['0th'] = { ...(dict['0th'] ?? {}), [306]: capture.dateTime };
    dict['Exif'] = {
      ...(dict['Exif'] ?? {}),
      [36867]: capture.dateTime,
      [36868]: capture.dateTime,
      [36880]: capture.offset,
      [36881]: capture.offset,
      [36882]: capture.offset,
    };
    return piexif.insert(piexif.dump(dict), dataUrl);
  } catch (error) {
    console.warn('[Urbaly] EXIF inject failed:', error);
    return dataUrl;
  }
}

/**
 * Compress to JPEG while keeping the EXIF capture moment the backend
 * requires. JPEG sources keep EXIF via `preserveExif`; other sources get
 * the original moment re-attached. Output tags are re-read to prove it.
 */
export async function compressImageKeepingExif(
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<{ dataUrl: string; sizeKB: number; originalSizeKB: number; exifKept: boolean }> {
  const targetMaxKB = options.maxSizeKB ?? 280; // < 290 KB
  const targetMaxMB = targetMaxKB / 1024;
  const originalSizeKB = Math.round(file.size / 1024);

  let capture: { dateTime: string; offset: string } | null = null;
  try {
    capture = pickCaptureMoment(await readExifTags(file));
  } catch (error) {
    console.warn(
      '[Urbaly] Could not read original EXIF dates:',
      error instanceof Error ? error.message : error
    );
  }

  let dataUrl: string;
  try {
    const compressToJpeg = (input: File | Blob, quality: number, maxMB: number) =>
      imageCompression(input as File, {
        maxSizeMB: maxMB,
        maxWidthOrHeight: options.maxWidthOrHeight ?? 1280,
        // Next.js serves the package worker URL relative to the current route,
        // which makes /mapa return HTML instead of a JavaScript worker.
        useWebWorker: false,
        fileType: 'image/jpeg',
        initialQuality: quality,
        preserveExif: true,
      });

    let compressedFile = await compressToJpeg(file, options.initialQuality ?? 0.82, targetMaxMB);
    if (compressedFile.size >= targetMaxKB * 1024) {
      compressedFile = await compressToJpeg(compressedFile, 0.65, 0.22);
    }
    if (compressedFile.type !== 'image/jpeg') {
      throw new Error('A compressão não retornou uma imagem JPEG.');
    }
    dataUrl = await fileToDataUrl(compressedFile);
  } catch (err) {
    console.warn('browser-image-compression fallback to canvas:', err);
    dataUrl = await canvasCompress(file, targetMaxKB * 1024, 'image/jpeg');
  }

  if (!dataUrl.startsWith('data:image/jpeg;base64,')) {
    throw new Error('A imagem comprimida não está no formato JPEG.');
  }

  dataUrl = ensureJpegCaptureDates(dataUrl, capture);

  let exifKept = false;
  let keptSource: string | null = null;
  try {
    const outTags = await readExifTags(
      new Blob([dataUrlToBytes(dataUrl) as BlobPart], { type: 'image/jpeg' })
    );
    const found = ['CreateDate', 'DateTimeOriginal', 'ModifyDate', 'DateTimeDigitized'].filter(
      (tag) => exifTagToDate(outTags[tag])
    );
    const offsets = ['OffsetTime', 'OffsetTimeOriginal', 'OffsetTimeDigitized'].filter(
      (tag) => typeof outTags[tag] === 'string' && (outTags[tag] as string).length > 0
    );
    exifKept = found.length > 0 && offsets.length > 0;
    keptSource = `${found.join(',') || 'none'}|offsets:${offsets.join(',') || 'none'}`;
  } catch (error) {
    console.warn(
      '[Urbaly] EXIF output verify failed:',
      error instanceof Error ? error.message : error
    );
  }
  console.info('[Urbaly] EXIF kept:', JSON.stringify({ exifKept, keptSource, wanted: capture }));

  const sizeKB = Math.round(((dataUrl.split(',')[1] ?? '').length * 3) / 4 / 1024);
  return { dataUrl, sizeKB, originalSizeKB, exifKept };
}
