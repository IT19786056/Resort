import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cld, isVideoUrl } from '../../lib/cloudinary';
import { useMediaQuery } from '../../hooks/queries';

interface GalleryProps {
  parentId: string;
  fallbackImage?: string;
  className?: string;
}

export const Gallery = ({ parentId, fallbackImage, className = "" }: GalleryProps) => {
  const [index, setIndex] = useState(0);
  const { data: media = [], isLoading } = useMediaQuery(parentId);

  const fetchedImages = media.map(m => m.data);
  const images = fetchedImages.length > 0
    ? fetchedImages
    : (fallbackImage ? [fallbackImage] : []);

  if (isLoading && !fallbackImage) {
    return <div className={`animate-pulse bg-natural-accent/20 ${className}`} />;
  }

  if (images.length === 0 && !fallbackImage) return null;
  
  const displayImages = images.length > 0 ? images : (fallbackImage ? [fallbackImage] : []);

  const next = () => setIndex((prev) => (prev + 1) % images.length);
  const prev = () => setIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className={`relative group overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        {isVideoUrl(displayImages[index]) ? (
          <motion.video
            key={index}
            src={displayImages[index]}
            autoPlay
            loop
            muted
            playsInline
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full object-cover"
          />
        ) : (
          <motion.img
            key={index}
            src={cld(displayImages[index], 'f_auto,q_auto,w_1600')}
            loading="lazy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full object-cover"
          />
        )}
      </AnimatePresence>

      {displayImages.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-transparent hover:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-transparent hover:text-white transition-all shadow-lg z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-transparent hover:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-transparent hover:text-white transition-all shadow-lg z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full z-10">
            {displayImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
