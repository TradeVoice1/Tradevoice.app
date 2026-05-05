// Client-side image compression for job photos.
// A typical phone photo is 3-8 MB at 4032x3024. For "proof of work" use,
// we don't need anywhere near that resolution. Downscaling the long edge
// to 1600px and re-encoding as JPEG q=0.85 typically lands at 200-500 KB
// — an 80-90% reduction that's invisible to the eye in normal viewing.
//
// This pays for itself twice: less storage cost on Supabase AND much
// faster modal load when a tech opens a job on LTE in a parking lot.
//
// HEIC files (iPhone default) don't decode in non-Safari canvas
// implementations, so we pass them through untouched. Safari produces
// reasonably small HEICs already (1-3 MB), and Supabase Storage accepts
// them. The handful of users who upload HEIC from non-Safari browsers
// just won't get compression — acceptable fallback.

const MAX_DIM = 1600;
const QUALITY = 0.85;
// Skip compression entirely if the input is already this small — no
// point spending CPU on a 200 KB file that's already fine.
const SKIP_BELOW_BYTES = 600 * 1024;

export async function compressImage(file) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (file.type === 'image/heic' || file.type === 'image/heif') return file;
  if (file.size < SKIP_BELOW_BYTES) return file;

  try {
    const img = await loadImage(file);
    const { width, height } = scaledSize(img.width, img.height, MAX_DIM);

    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) return file;

    // If somehow compression made the file BIGGER (weird PNG edge cases),
    // fall back to the original.
    if (blob.size >= file.size) return file;

    // Wrap as a File so the upload helper still gets a name + lastModified.
    const newName = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (e) {
    console.warn('image compression failed, uploading original', e);
    return file;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
    img.src = url;
  });
}

function scaledSize(w, h, max) {
  if (w <= max && h <= max) return { width: w, height: h };
  if (w >= h) return { width: max, height: Math.round(h * max / w) };
  return { width: Math.round(w * max / h), height: max };
}
