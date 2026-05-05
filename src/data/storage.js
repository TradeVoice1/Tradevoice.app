// Supabase Storage helpers — currently just the company logo upload.
// Bucket "company-logos" is public-read; writes are RLS-locked to <userId>/...

import { supabase } from "../supabase";

const BUCKET = 'company-logos';
const MAX_BYTES = 2 * 1024 * 1024;   // 2 MB
const VALID_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];

// Upload a logo file for the given user. Returns the public URL.
// Old logos are deleted after the new one uploads cleanly so we don't pile up dead files.
export async function uploadLogo(userId, file) {
  if (!userId) throw new Error('Must be signed in to upload a logo.');
  if (!file)   throw new Error('No file selected.');
  if (!VALID_TYPES.includes(file.type)) throw new Error('Logo must be a PNG, JPG, SVG, WebP, or GIF.');
  if (file.size > MAX_BYTES) throw new Error('Logo must be smaller than 2 MB.');

  // Unique filename per upload so browser caches don't show a stale image after replace.
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${userId}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',   // 1 year — we change the path on every replace, so this is safe
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

// Delete a previously uploaded logo. Used when the user clicks the "remove" X
// or replaces with a new one. Silently no-ops if URL doesn't match this bucket.
export async function deleteLogo(logoUrl) {
  if (!logoUrl) return;
  // Public URLs look like:
  //   https://<project>.supabase.co/storage/v1/object/public/company-logos/<userId>/logo-<ts>.<ext>
  // We just want everything after "company-logos/".
  const m = logoUrl.match(new RegExp(`/${BUCKET}/(.+)$`));
  if (!m) return;
  const path = m[1].split('?')[0];   // drop any query string
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
