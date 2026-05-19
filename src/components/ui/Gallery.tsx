import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dbService } from '../../services/db';

interface GalleryProps {
  parentId: string;
  fallbackImage?: string;
  className?: string;
}

export const Gallery = ({ parentId, fallbackImage, className = "" }: GalleryProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const data = await dbService.getMedia(parentId);
        const fetchedImages = data.map(m => m.data);
        if (fetchedImages.length > 0) {
          setImages(fetchedImages);
        } else if (fallbackImage) {
          setImages([fallbackImage]);
        }
      } catch (e) {
        console.error(e);
        if (fallbackImage) setImages([fallbackImage]);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, [parentId, fallbackImage]);

  if (loading && !fallbackImage) {
    return <div className={`animate-pulse bg-natural-accent/20 ${className}`} />;
  }

  if (images.length === 0 && !fallbackImage) return null;
  
  const displayImages = images.length > 0 ? images : (fallbackImage ? [fallbackImage] : []);

  const next = () => setIndex((prev) => (prev + 1) % images.length);
  const prev = () => setIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className={`relative group overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={displayImages[index]}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>

      {displayImages.length > 1 && (
        <>
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={prev} className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-natural-dark hover:bg-white">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next} className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-natural-dark hover:bg-white">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full">
            {displayImages.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-white w-4' : 'bg-white/40'}`} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
