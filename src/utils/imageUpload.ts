export const MAX_NEWS_IMAGE_BYTES = 1024 * 1024;
const TARGET_IMAGE_BYTES = 950 * 1024;

/** Batas & target untuk non-berita (galeri, inventaris, dll) */
export const MAX_GENERAL_IMAGE_BYTES = 500 * 1024;          // 500 KB hard limit
const TARGET_GENERAL_IMAGE_BYTES     = 450 * 1024;          // 450 KB target kompresi

export type PreparedNewsImage = {
  file: File;
  originalSize: number;
  width: number;
  height: number;
};

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('File gambar tidak dapat dibaca.'));
  };
  image.src = url;
});

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Gagal memproses gambar.')), type, quality);
  });

/** Menyiapkan foto sampul dengan dimensi dan ukuran aman untuk unggahan web. */
export async function prepareNewsImage(file: File): Promise<PreparedNewsImage> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error('Gunakan foto berformat JPG, PNG, atau WebP.');
  }

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  let width = Math.max(1, Math.round(sourceWidth * scale));
  let height = Math.max(1, Math.round(sourceHeight * scale));
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 7; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak mendukung pemrosesan gambar.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const quality = Math.max(0.52, 0.9 - attempt * 0.07);
    blob = await canvasToBlob(canvas, 'image/webp', quality);
    // Browser lama yang belum mendukung WebP dapat mengembalikan PNG; JPEG menjaga target 1 MB tetap tercapai.
    if (blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= TARGET_IMAGE_BYTES) break;
    width = Math.max(640, Math.round(width * 0.82));
    height = Math.max(480, Math.round(height * 0.82));
  }

  if (!blob || blob.size > MAX_NEWS_IMAGE_BYTES) {
    throw new Error('Foto belum bisa diperkecil hingga 1 MB. Pilih foto lain yang lebih sederhana.');
  }

  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const filename = `${file.name.replace(/\.[^.]+$/, '') || 'foto-berita'}.${extension}`;
  return { file: new File([blob], filename, { type: blob.type }), originalSize: file.size, width, height };
}

export function formatImageSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 1024 * 1024 ? 2 : 1)} MB`;
}

/**
 * Menyiapkan foto umum (galeri, inventaris, dll) dengan kompresi maksimal 500 KB.
 * Dimensi max sisi terpanjang 1280px. Format output: WebP → fallback JPEG.
 */
export async function prepareImage500KB(file: File): Promise<PreparedNewsImage> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error('Gunakan foto berformat JPG, PNG, atau WebP.');
  }

  const image = await loadImage(file);
  const sourceWidth  = image.naturalWidth  || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  let width  = Math.max(1, Math.round(sourceWidth  * scale));
  let height = Math.max(1, Math.round(sourceHeight * scale));
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 9; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const quality = Math.max(0.45, 0.88 - attempt * 0.08);
    blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= TARGET_GENERAL_IMAGE_BYTES) break;
    width  = Math.max(480, Math.round(width  * 0.80));
    height = Math.max(360, Math.round(height * 0.80));
  }

  if (!blob || blob.size > MAX_GENERAL_IMAGE_BYTES) {
    throw new Error('Foto belum bisa diperkecil hingga 500 KB. Pilih foto lain yang lebih sederhana.');
  }

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${file.name.replace(/\.[^.]+$/, '') || 'foto'}.${extension}`;
  return { file: new File([blob], filename, { type: blob.type }), originalSize: file.size, width, height };
}
