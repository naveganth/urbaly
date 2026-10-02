import { parse } from 'exifr';

/** Photos must be taken within this window to be accepted as evidence. */
export const PHOTO_FRESHNESS_MINUTES = 10;
const FUTURE_SKEW_TOLERANCE_MINUTES = 2;

export type ExifTagSource = 'CreateDate' | 'DateTimeOriginal' | 'ModifyDate';

export interface PhotoFreshnessResult {
  accepted: boolean;
  capturedAt: Date | null;
  ageMinutes: number | null;
  tagSource: ExifTagSource | null;
  reason?: 'no-exif' | 'too-old' | 'unreadable';
  detail?: string;
}

export function exifTagToDate(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

// exifr reads Blobs via FileReader whose onerror rejects with a bare
// ProgressEvent — unwrap it so logs show the real cause (NotReadableError…).
function describeError(error: unknown): string {
  if (typeof ProgressEvent !== 'undefined' && error instanceof ProgressEvent) {
    const inner = (error.target as { error?: { name?: string; message?: string } } | null)
      ?.error;
    return `ProgressEvent(${error.type}${inner ? `, ${inner.name}: ${inner.message}` : ''})`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

/** Full EXIF tag set. Throws a greppable Error, never a bare ProgressEvent. */
export async function readExifTags(file: File | Blob): Promise<Record<string, unknown>> {
  let raw: Uint8Array;
  try {
    raw = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    throw new Error(`EXIF read failed: ${describeError(error)}`);
  }
  if (raw.length === 0) throw new Error('EXIF read failed: empty file');
  try {
    return (await parse(raw)) ?? {};
  } catch (error) {
    throw new Error(`EXIF parse failed: ${describeError(error)}`);
  }
}

// One compact line per photo: dates, offsets, camera, dimensions.
function logExifSummary(fileName: string, tags: Record<string, unknown>) {
  const date = (v: unknown) =>
    v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null;
  console.info(
    '[Urbaly] EXIF:',
    JSON.stringify({
      name: fileName,
      dates: {
        CreateDate: date(tags.CreateDate),
        DateTimeOriginal: date(tags.DateTimeOriginal),
        ModifyDate: date(tags.ModifyDate),
      },
      offsets: [tags.OffsetTime, tags.OffsetTimeOriginal, tags.OffsetTimeDigitized].filter(
        (o): o is string => typeof o === 'string'
      ),
      camera: [tags.Make, tags.Model].filter(Boolean).join(' ') || null,
      size:
        tags.ExifImageWidth && tags.ExifImageHeight
          ? `${tags.ExifImageWidth}x${tags.ExifImageHeight}`
          : null,
    })
  );
}

export async function validatePhotoFreshness(file: File | Blob): Promise<PhotoFreshnessResult> {
  const fileName = file instanceof File ? file.name : 'blob';
  const done = (result: PhotoFreshnessResult): PhotoFreshnessResult => {
    console.info(
      '[Urbaly] EXIF freshness:',
      JSON.stringify({
        name: fileName,
        tagSource: result.tagSource,
        capturedAt: result.capturedAt?.toISOString() ?? null,
        ageMinutes:
          result.ageMinutes !== null ? Math.round(result.ageMinutes * 10) / 10 : null,
        accepted: result.accepted,
        reason: result.reason ?? null,
        detail: result.detail ?? null,
      })
    );
    return result;
  };
  const reject = (
    reason: NonNullable<PhotoFreshnessResult['reason']>,
    extra?: Partial<PhotoFreshnessResult>
  ): PhotoFreshnessResult =>
    done({ accepted: false, capturedAt: null, ageMinutes: null, tagSource: null, reason, ...extra });

  let tags: Record<string, unknown>;
  try {
    tags = await readExifTags(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[Urbaly] EXIF parse failed:', fileName, message);
    return reject('unreadable', {
      detail: message.startsWith('EXIF read failed')
        ? 'o navegador não conseguiu ler o arquivo — selecione a foto novamente'
        : 'não foi possível interpretar os dados da foto',
    });
  }

  logExifSummary(fileName, tags);

  let capturedAt: Date | null = null;
  let tagSource: ExifTagSource | null = null;
  for (const tag of ['CreateDate', 'DateTimeOriginal', 'ModifyDate'] as const) {
    const candidate = exifTagToDate(tags[tag]);
    if (candidate && (!capturedAt || candidate < capturedAt)) {
      capturedAt = candidate;
      tagSource = tag;
    }
  }
  if (!capturedAt) return reject('no-exif');

  const ageMinutes = (Date.now() - capturedAt.getTime()) / 60000;
  if (ageMinutes < -FUTURE_SKEW_TOLERANCE_MINUTES) {
    return reject('unreadable', { capturedAt, ageMinutes, tagSource });
  }
  if (ageMinutes <= PHOTO_FRESHNESS_MINUTES) {
    return done({ accepted: true, capturedAt, ageMinutes, tagSource });
  }
  return done({ accepted: false, capturedAt, ageMinutes, tagSource, reason: 'too-old' });
}
