import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';

interface GalleryImage {
  src: string;
  category: string;
  caption: string;
}

const GALLERY: GalleryImage[] = [
  { src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop', category: 'Suites', caption: 'Lakeside Suite at first light' },
  { src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop', category: 'Rooms', caption: 'Garden-view sanctuary' },
  { src: 'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?q=80&w=1600&auto=format&fit=crop', category: 'Pool', caption: 'The infinity edge' },
  { src: 'https://images.unsplash.com/photo-1559738501-fea3e1c5b6b9?q=80&w=1600&auto=format&fit=crop', category: 'Surroundings', caption: 'Sunset over the bay' },
  { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&auto=format&fit=crop', category: 'Dining', caption: 'Table by the water' },
  { src: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1600&auto=format&fit=crop', category: 'Rooms', caption: 'Linen and quiet light' },
  { src: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1600&auto=format&fit=crop', category: 'Experiences', caption: 'Highland trails' },
  { src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1600&auto=format&fit=crop', category: 'Spa', caption: 'Ayurvedic ritual' },
  { src: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1600&auto=format&fit=crop', category: 'Suites', caption: 'The bungalow verandah' },
  { src: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1600&auto=format&fit=crop', category: 'Experiences', caption: 'Cycling the paddy fields' },
  { src: 'https://images.unsplash.com/photo-1455587734955-081b22074882?q=80&w=1600&auto=format&fit=crop', category: 'Pool', caption: 'Poolside afternoons' },
  { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&auto=format&fit=crop', category: 'Dining', caption: 'A feast of the island' },
  { src: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1600&auto=format&fit=crop', category: 'Surroundings', caption: 'Barefoot luxury' },
  { src: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop', category: 'Rooms', caption: 'Where mornings begin' },
  { src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1600&auto=format&fit=crop', category: 'Suites', caption: 'The master retreat' },
  { src: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1600&auto=format&fit=crop', category: 'Experiences', caption: 'Beneath the surface' },
  { src: 'https://images.unsplash.com/photo-1582126892906-5ba111b4c1c6?q=80&w=1600&auto=format&fit=crop', category: 'Surroundings', caption: 'Tea country mornings' },
  { src: 'https://images.unsplash.com/photo-1551918120-9739cb430c6d?q=80&w=1600&auto=format&fit=crop', category: 'Spa', caption: 'Stillness, by design' },
];

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2400&auto=format&fit=crop';

interface GalleryPageProps {
  onReserve?: () => void;
}

export const GalleryPage = ({ onReserve }: GalleryPageProps) => {
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(GALLERY.map(g => g.category)))],
    [],
  );
  const [active, setActive] = useState('All');
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  const visible = active === 'All' ? GALLERY : GALLERY.filter(g => g.category === active);

  return (
    <div className="min-h-screen bg-natural-bg">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-40 pb-24 md:pt-52 md:pb-32 px-6 md:px-10">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-b from-natural-dark/70 via-natural-dark/55 to-natural-dark/80" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="relative max-w-4xl mx-auto text-center space-y-6"
        >
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/60">A Visual Journey</span>
          <h1 className="font-serif text-fluid-hero italic text-white leading-tight">The Gallery</h1>
          <p className="text-white/80 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
            Some things are better felt than described. Wander through moments captured across our
            world — from the hush of an empty suite at dawn to the last gold of a coastal sunset.
          </p>
        </motion.div>
      </section>

      {/* ── Filter + Masonry grid ────────────────────────────────────────── */}
      <section className="bg-white py-16 md:py-24 px-4 sm:px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          {/* Category filter */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3 mb-12 md:mb-16">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-5 py-2.5 rounded-full font-bold uppercase text-[10px] tracking-[0.2em] transition-all border ${
                  active === cat
                    ? 'bg-natural-primary text-white border-natural-primary shadow-lg shadow-natural-primary/20'
                    : 'bg-white text-natural-muted border-natural-accent hover:text-natural-dark hover:border-natural-primary/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Masonry via CSS columns — keeps a natural, editorial rhythm */}
          <motion.div layout className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 [column-fill:_balance]">
            <AnimatePresence>
              {visible.map((img, i) => (
                <motion.figure
                  key={img.src + img.caption}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: (i % 6) * 0.04 }}
                  onClick={() => setLightbox(img)}
                  className="group relative mb-4 md:mb-6 break-inside-avoid rounded-[20px] overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-shadow duration-500"
                >
                  <img
                    src={img.src}
                    alt={img.caption}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-[1200ms]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-natural-dark/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-5">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/70">{img.category}</span>
                      <p className="font-serif italic text-white text-lg leading-tight">{img.caption}</p>
                    </div>
                  </div>
                </motion.figure>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-natural-primary py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center space-y-7">
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/50">Step Inside the Frame</span>
          <h2 className="font-serif text-fluid-h1 italic text-white leading-tight">Your Story Begins Here</h2>
          <p className="text-white/75 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
            Pictures can only carry you so far. Reserve your stay and trade the gallery for the real thing.
          </p>
          <button
            onClick={onReserve}
            className="inline-flex items-center gap-3 bg-white text-natural-primary font-bold uppercase tracking-widest text-fluid-eyebrow px-10 py-5 rounded-full hover:bg-natural-cream transition-colors duration-300 shadow-lg"
          >
            Reserve Your Stay <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10 bg-natural-dark/90 backdrop-blur-lg"
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-5 right-5 p-3 bg-white/15 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.figure
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={e => e.stopPropagation()}
              className="relative max-w-5xl w-full"
            >
              <img
                src={lightbox.src}
                alt={lightbox.caption}
                className="w-full max-h-[80vh] object-contain rounded-[20px] shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <figcaption className="text-center mt-5">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">{lightbox.category}</span>
                <p className="font-serif italic text-white text-xl">{lightbox.caption}</p>
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
