import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cld, isVideoUrl } from '../lib/cloudinary';

const HERO_MEDIA_PARENT_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=2070&auto=format&fit=crop';

export const Hero = () => {
  const [heroMedia, setHeroMedia] = useState<{ id: string; data: string } | null>(null);
  const [mediaFetched, setMediaFetched] = useState(false);

  useEffect(() => {
    fetch(`/api/media/${HERO_MEDIA_PARENT_ID}`)
      .then(r => r.json())
      .then((items: any[]) => {
        if (items && items.length > 0) setHeroMedia(items[0]);
      })
      .catch(() => {})
      .finally(() => setMediaFetched(true));
  }, []);

  const isVideo = isVideoUrl(heroMedia?.data);

  return (
    <section className="relative h-[100vh] min-h-[600px] w-full overflow-hidden bg-natural-dark">
      {mediaFetched && (
        isVideo ? (
          <video
            src={heroMedia!.data}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <motion.img
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2 }}
            src={cld(heroMedia?.data, 'f_auto,q_auto,w_2000') || DEFAULT_IMAGE}
            alt="Luxury Resort"
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )
      )}
    </section>
  );
};
