// Job photo upload helpers — backed by the public "job-photos" Supabase
// Storage bucket. Writes are RLS-locked to <userId>/<jobId>/...
// Mirrors the logo upload pattern in src/data/storage.js.

import { supabase } from "../supabase";

const BUCKET   = 'job-photos';
const MAX_BYTES = 8 * 1024 * 1024;   // 8 MB — phone photos can be chunky
const VALID_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];

// Upload a single photo file for the given job. Returns the public URL.
export async function uploadJobPhoto(userId, jobId, file) {
  if (!userId) throw new Error('Must be signed in to upload a photo.');
  if (!jobId)  throw new Error('No job to attach this photo to.');
  if (!file)   throw new Error('No file selected.');
  if (!VALID_TYPES.includes(file.type)) throw new Error('Photo must be a PNG, JPG, WebP, or HEIC.');
  if (file.size > MAX_BYTES) {
    // HEIC files can't be downscaled by our canvas-based compressor (most
    // non-Safari browsers can't decode them), so a too-big HEIC bypasses
    // compression and lands here. Tell the user how to recover instead of
    // showing a generic size error.
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif';
    if (isHeic) {
      throw new Error('This HEIC photo is too large to upload. Open it in your phone\'s Photos app, share it as JPEG, then re-upload — or change your camera setting to "Most Compatible".');
    }
    throw new Error('Photo must be smaller than 8 MB.');
  }

  // Unique filename per upload so cache + ordering work cleanly.
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${jobId}/photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',   // 1 year — paths are unique per upload
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

// Delete a previously uploaded photo. Silently no-ops if URL doesn't match this bucket.
export async function deleteJobPhoto(photoUrl) {
  if (!photoUrl) return;
  // Public URLs look like:
  //   https://<project>.supabase.co/storage/v1/object/public/job-photos/<userId>/<jobId>/photo-<ts>.<ext>
  // We just want everything after "job-photos/".
  const m = photoUrl.match(new RegExp(`/${BUCKET}/(.+)$`));
  if (!m) return;
  const path = m[1].split('?')[0];
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
