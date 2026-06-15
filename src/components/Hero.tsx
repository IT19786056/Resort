import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cld, isVideoUrl } from '../lib/cloudinary';

const HERO_MEDIA_PARENT_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=2070&auto=format&fit=crop';
const SESSION_KEY = 'hero_media_v1';

function readCache(): { id: string; data: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(media: { id: string; data: string } | null) {
  try {
    if (media) sessionStorage.setItem(SESSION_KEY, JSON.stringify(media));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

// Cloudinary videos can serve a JPEG frame as a poster by swapping the
// resource-type segment and changing the extension to .jpg.
function videoPoster(url: string): string | undefined {
  if (!url.includes('/video/upload/')) return undefined;
  // Insert frame-grab transform and force .jpg extension
  return url
    .replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto,w_1600/')
    .replace(/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i, '.jpg');
}

export const Hero = () => {
  // Render the real media on the very first paint. The server injects the
  // current hero media into the HTML (window.__HERO_MEDIA__) so even a brand
  // new device skips the default-image flash; sessionStorage covers repeat
  // visits if the injection is ever unavailable.
  const [heroMedia, setHeroMedia] = useState<{ id: string; data: string } | null>(() => {
    const injected = (window as any).__HERO_MEDIA__;
    if (injected?.data) return injected;
    return readCache();
  });

  useEffect(() => {
    // Always re-fetch in the background to pick up admin changes, but don't
    // block rendering on the result — the cached value (or the default image)
    // is already showing.
    fetch(`/api/media/${HERO_MEDIA_PARENT_ID}`)
      .then(r => r.json())
      .then((items: any[]) => {
        const media = items?.length > 0 ? items[0] : null;
        setHeroMedia(media);
        writeCache(media);
      })
      .catch(() => {});
  }, []);

  const isVideo = isVideoUrl(heroMedia?.data);
  const imageSrc = cld(heroMedia?.data, 'f_auto,q_auto,w_2000') || DEFAULT_IMAGE;

  return (
    <section
      className="relative w-full overflow-hidden bg-natural-dark"
      // Sit the hero *below* the fixed navbar (whose measured height is exposed
      // as --nav-h) so the opaque header never hides the top of the media.
      style={{ height: 'calc(100dvh - var(--nav-h, 0px))', minHeight: '600px', marginTop: 'var(--nav-h, 0px)' }}
    >
      {isVideo ? (
        <video
          src={cld(heroMedia!.data, 'q_auto,w_1600')}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={videoPoster(heroMedia!.data)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2 }}
          src={imageSrc}
          alt="Luxury Resort"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </section>
  );
};
