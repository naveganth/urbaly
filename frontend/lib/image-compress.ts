import imageCompression from 'browser-image-compression';

export interface CompressImageOptions {
  maxSizeKB?: number; // Default 280 (guaranteed < 290KB)
  maxWidthOrHeight?: number; // Default 1280
  initialQuality?: number; // Default 0.82
}

const MAX_TARGET_BYTES = 290 * 1024; // 290 KB in bytes (296,960 bytes)

/**
 * Converts a Blob or File to a Base64 Data URL.
 */
function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao converter imagem para data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Erro ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Fallback compressor using HTMLCanvasElement for WebP conversion and scaling.
 */
async function canvasCompressToWebP(
  file: File | Blob,
  maxBytes: number = MAX_TARGET_BYTES
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

      // Iteratively reduce quality until size is under maxBytes
      let quality = 0.8;
      let dataUrl = canvas.toDataURL('image/webp', quality);

      while (dataUrl.length > maxBytes * 1.33 && quality > 0.15) {
        quality -= 0.15;
        dataUrl = canvas.toDataURL('image/webp', quality);
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

/**
 * Compresses any image (JPEG, PNG, HEIC, etc.) to WebP format, ensuring
 * the final output is strictly below 290KB.
 */
export async function compressImageToWebP(
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<{ dataUrl: string; sizeKB: number; originalSizeKB: number }> {
  const targetMaxKB = options.maxSizeKB ?? 280; // < 290 KB
  const targetMaxMB = targetMaxKB / 1024; // ~0.273 MB
  const originalSizeKB = Math.round(file.size / 1024);

  try {
    const compressionConfig = {
      maxSizeMB: targetMaxMB,
      maxWidthOrHeight: options.maxWidthOrHeight ?? 1280,
      // Next.js serves the package worker URL relative to the current route,
      // which makes /mapa return HTML instead of a JavaScript worker.
      useWebWorker: false,
      fileType: 'image/webp',
      initialQuality: options.initialQuality ?? 0.82,
    };

    let compressedFile = await imageCompression(file as File, compressionConfig);

    // If still larger than 290KB, do a second tighter pass
    if (compressedFile.size >= targetMaxKB * 1024) {
      compressedFile = await imageCompression(compressedFile, {
        ...compressionConfig,
        maxSizeMB: 0.22,
        initialQuality: 0.65,
      });
    }

    const dataUrl = await fileToDataUrl(compressedFile);
    const sizeKB = Math.round(compressedFile.size / 1024);

    return { dataUrl, sizeKB, originalSizeKB };
  } catch (err) {
    console.warn('browser-image-compression fallback to canvas:', err);
    const dataUrl = await canvasCompressToWebP(file, targetMaxKB * 1024);
    const estimatedBytes = Math.round((dataUrl.length * 3) / 4);
    return { dataUrl, sizeKB: Math.round(estimatedBytes / 1024), originalSizeKB };
  }
}
