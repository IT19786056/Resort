// Cloudinary client-side helpers.
//
// We use *unsigned* uploads so no Cloudinary API secret ever ships to the
// browser. You create an unsigned upload preset in the Cloudinary dashboard
// and expose only the (public-safe) cloud name + preset name via Vite env vars:
//
//   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
//   VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
//
// Uploaded assets are stored on Cloudinary's CDN and we persist only the
// returned secure_url in Postgres (replacing the old base64-in-DB approach).

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export interface CloudinaryUploadResult {
  url: string;            // secure_url on the CDN
  publicId: string;       // public_id (useful for deletion later)
  resourceType: 'image' | 'video' | 'raw';
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Upload a single File (image or video) to Cloudinary via an unsigned preset.
 * Uses the `auto` resource type so the same call handles images and videos.
 */
export async function uploadToCloudinary(
  file: File,
  options?: { folder?: string; onProgress?: (percent: number) => void },
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured) {
    throw new Error(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env.',
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET as string);
  if (options?.folder) form.append('folder', options.folder);

  // Use XHR so we can surface upload progress for large videos.
  const result = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options?.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        const msg = xhr.response?.error?.message || `Cloudinary upload failed (${xhr.status})`;
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary.'));
    xhr.send(form);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/** True if a stored media value points at a video (Cloudinary URL or legacy base64). */
export function isVideoUrl(value?: string | null): boolean {
  if (!value) return false;
  if (value.startsWith('data:video/')) return true; // legacy base64 fallback
  if (value.includes('/video/upload/')) return true; // Cloudinary video delivery URL
  return /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(value);
}

/**
 * Inject Cloudinary delivery transformations into a secure_url so we can
 * request right-sized, auto-format, auto-quality assets from the CDN.
 * No-ops for non-Cloudinary URLs (e.g. Unsplash or legacy base64).
 *
 *   cld(url, 'f_auto,q_auto,w_800')
 */
export function cld(url?: string | null, transform = 'f_auto,q_auto'): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;

  const [head, tail] = url.split('/upload/');
  if (tail === undefined) return url;

  // If the first segment after /upload/ already looks like a transformation
  // chain (e.g. "f_auto,q_auto" or "w_800/..."), leave it untouched.
  const firstSegment = tail.split('/')[0];
  const alreadyTransformed = /(^|,)[a-z]{1,4}_/.test(firstSegment);
  if (alreadyTransformed) return url;

  return `${head}/upload/${transform}/${tail}`;
}

/**
 * Build a responsive `srcset` from a Cloudinary URL at the given widths so each
 * device downloads an appropriately-sized image instead of one fixed (large)
 * size. Returns undefined for non-Cloudinary URLs, where resizing isn't possible
 * and a srcset would just repeat the same file.
 *
 *   cldSrcSet(url, [400, 800]) -> ".../w_400/... 400w, .../w_800/... 800w"
 */
export function cldSrcSet(url?: string | null, widths: number[] = [], base = 'f_auto,q_auto'): string | undefined {
  if (!url || widths.length === 0) return undefined;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return undefined;
  return widths.map(w => `${cld(url, `${base},w_${w}`)} ${w}w`).join(', ');
}
