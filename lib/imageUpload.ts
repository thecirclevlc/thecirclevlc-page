import { supabase } from './supabase';

// ── Max widths per folder (for WebP downscaling) ────────────────
const MAX_WIDTHS: Record<string, number> = {
  'events/covers':        1920,
  'events/gallery':       1200,
  'events/hero-videos':   0,    // videos — not processed
  'page-backgrounds':     1920,
  'page-backgrounds/videos': 0, // videos — not processed
  'djs':                  800,
  'artists':              800,
  'general':              1200,
};

/**
 * Converts a File to WebP using the Canvas API (no dependencies).
 * Falls back to the original file if conversion fails (SVG, GIF, unsupported).
 */
async function convertToWebP(
  file: File,
  maxWidth = 1200,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve) => {
    // Skip non-image types or already-webp
    if (!file.type.startsWith('image/') || file.type === 'image/webp') {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Downscale if exceeds maxWidth
      if (maxWidth > 0 && width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const newName = file.name.replace(/\.[^.]+$/, '.webp');
          resolve(new File([blob], newName, { type: 'image/webp' }));
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback — upload as-is
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image file to Supabase Storage.
 * Automatically converts to WebP and downscales before uploading.
 * @param file   - The File object to upload
 * @param folder - Sub-folder within the 'images' bucket (e.g. 'events/covers', 'djs')
 */
export async function uploadImage(file: File, folder = 'general'): Promise<string> {
  const maxWidth = MAX_WIDTHS[folder] ?? 1200;

  // Convert to optimised WebP
  const optimised = await convertToWebP(file, maxWidth, 0.85);

  // Always use .webp extension after conversion
  const ext = optimised.type === 'image/webp' ? 'webp' : (file.name.split('.').pop()?.toLowerCase() ?? 'jpg');
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(uniqueName, optimised, {
      cacheControl: '31536000', // 1 year
      upsert: false,
      contentType: optimised.type,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(uniqueName);

  return data.publicUrl;
}

/**
 * Uploads a video file to Supabase Storage (no conversion).
 * @param file   - The video File to upload (MP4, WebM)
 * @param folder - Sub-folder within the 'images' bucket
 */
export async function uploadVideo(file: File, folder = 'videos'): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(uniqueName, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || 'video/mp4',
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(uniqueName);

  return data.publicUrl;
}

/**
 * Deletes a media file from Supabase Storage by its public URL.
 * Works for both images and videos.
 * @param url - The full public URL of the file
 */
export async function deleteImage(url: string): Promise<void> {
  // Extract the path after /storage/v1/object/public/images/
  const match = url.match(/\/storage\/v1\/object\/public\/images\/(.+)$/);
  if (!match) return;

  const path = match[1];
  const { error } = await supabase.storage.from('images').remove([path]);
  if (error) console.error('[deleteMedia] Error:', error);
}

// Alias for videos (same bucket)
export const deleteVideo = deleteImage;
