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
  // Initialise from sessionStorage so the media renders on the first paint
  // instead of waiting for the API round-trip.
  const [heroMedia, setHeroMedia] = useState<{ id: string; data: string } | null>(readCache);

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
    <section className="relative h-[100vh] min-h-[600px] w-full overflow-hidden bg-natural-dark">
      {isVideo ? (
        <video
          src={heroMedia!.data}
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
