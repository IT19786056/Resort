import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ArrowRight, Star, Quote } from 'lucide-react';
import { cld, cldSrcSet } from '../lib/cloudinary';
import { EXPERIENCES } from './Experiences';

const CARD_IMAGE_SIZES = '(max-width: 768px) 90vw, (max-width: 1024px) 45vw, 33vw';

// ── Welcome / intro band ────────────────────────────────────────────────────
export const IntroBand = ({ brandName }: { brandName: string }) => (
  <section className="bg-white py-20 md:py-28 px-6 md:px-10">
    <div className="max-w-4xl mx-auto text-center space-y-6">
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary"
      >
        Welcome to {brandName}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.05 }}
        className="font-serif text-fluid-h1 italic text-natural-dark leading-tight tracking-tight"
      >
        An Island Sanctuary, Made for Slowing Down
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-natural-muted leading-relaxed font-light text-fluid-body max-w-2xl mx-auto"
      >
        Where the warmth of Sri Lankan hospitality meets considered design and the quiet rhythm of the
        tropics. Every stay is an invitation to breathe deeper, wander further, and remember what rest
        truly feels like.
      </motion.p>
    </div>
  </section>
);

// ── Featured experiences teaser ─────────────────────────────────────────────
interface FeaturedExperiencesProps {
  onExplore: () => void;
}
export const FeaturedExperiences = ({ onExplore }: FeaturedExperiencesProps) => {
  const featured = EXPERIENCES.slice(0, 4);
  return (
    <section className="bg-natural-cream py-20 md:py-28 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <div className="space-y-3">
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">Beyond Your Room</span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">Unforgettable Experiences</h2>
          </div>
          <button
            onClick={onExplore}
            className="self-start md:self-auto inline-flex items-center gap-3 text-natural-primary font-bold uppercase tracking-[0.2em] text-[11px] border-b-2 border-natural-primary pb-1.5 hover:gap-4 transition-all"
          >
            View All Experiences <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {featured.map((exp, i) => (
            <motion.button
              key={exp.id}
              onClick={onExplore}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 4) * 0.08, duration: 0.6 }}
              className="group relative rounded-[24px] overflow-hidden aspect-[3/4] shadow-md text-left"
            >
              <img
                src={exp.image}
                alt={exp.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1400ms]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-natural-dark/85 via-natural-dark/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 space-y-2">
                <div className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center mb-1">
                  <exp.icon className="w-4 h-4 text-natural-primary" />
                </div>
                <h3 className="font-serif text-lg md:text-xl italic text-white leading-tight">{exp.title}</h3>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Signature stays preview ─────────────────────────────────────────────────
const StayCard = memo(({ item, index, onSelect, onBook }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: index * 0.1 }}
    onClick={() => onSelect(item)}
    className="bg-natural-cream rounded-[24px] overflow-hidden flex flex-col shadow-md border border-natural-accent group hover:shadow-2xl transition-all duration-500 cursor-pointer"
  >
    <div className="w-full aspect-[16/10] bg-natural-accent overflow-hidden relative">
      <img
        src={cld(item.imageUrl, 'f_auto,q_auto,w_800')}
        srcSet={cldSrcSet(item.imageUrl, [400, 640, 800])}
        sizes={CARD_IMAGE_SIZES}
        alt={item.name}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-fluid-eyebrow font-bold uppercase tracking-[0.2em] text-natural-primary border border-natural-accent">
        {item.type}
      </div>
    </div>
    <div className="p-7 flex flex-col flex-1">
      <h3 className="font-serif text-fluid-card-title text-natural-dark italic mb-3 group-hover:text-natural-primary transition-colors">{item.name}</h3>
      <p className="text-sm text-natural-muted leading-relaxed mb-6 flex-1 italic font-light line-clamp-3">{item.description}</p>
      <div className="mt-auto flex items-center justify-between pt-6 border-t border-white">
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-natural-dark">LKR {Number(item.price).toLocaleString()}</span>
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.2em] text-natural-muted ml-2">/ night</span>
        </div>
        <button
          onClick={(e) => onBook(e, item)}
          className="bg-natural-primary text-white p-3.5 rounded-full hover:bg-natural-dark transition-all shadow-lg active:scale-95"
          aria-label={`Reserve ${item.name}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  </motion.div>
));

interface SignatureStaysProps {
  items: any[];
  onSelect: (item: any) => void;
  onBook: (e: React.MouseEvent, item: any) => void;
  onViewAll: () => void;
}
export const SignatureStays = ({ items, onSelect, onBook, onViewAll }: SignatureStaysProps) => {
  if (!items || items.length === 0) return null;
  const preview = items.slice(0, 3);
  return (
    <section className="bg-white py-20 md:py-28 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16 space-y-4">
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">Where You’ll Rest</span>
          <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight tracking-tight">Signature Stays</h2>
          <p className="text-natural-muted max-w-2xl mx-auto font-light text-fluid-body italic">
            A glimpse of the spaces awaiting you — each one crafted with intention, light and the colours of the island.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {preview.map((item, i) => (
            <StayCard key={item.id} item={item} index={i} onSelect={onSelect} onBook={onBook} />
          ))}
        </div>

        <div className="text-center mt-14">
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-3 bg-natural-primary text-white font-bold uppercase tracking-widest text-fluid-eyebrow px-10 py-5 rounded-full hover:bg-natural-dark transition-colors duration-300 shadow-lg"
          >
            View All Accommodations <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

// ── Testimonials ────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: 'The most restorative week we have ever spent. From the welcome to the farewell, every detail felt quietly perfect — as though the place had been waiting just for us.',
    name: 'Eleanor & James',
    origin: 'London, United Kingdom',
  },
  {
    quote: 'I came for the beaches and left changed by the people. The team anticipated needs I did not know I had. This is hospitality as an art form.',
    name: 'Priya Raman',
    origin: 'Singapore',
  },
  {
    quote: 'Wild jungle on one side, the ocean on the other, and absolute serenity in between. We are already planning our return before we have even unpacked.',
    name: 'Sofia & Marco',
    origin: 'Milan, Italy',
  },
];

export const Testimonials = () => (
  <section className="bg-natural-primary py-20 md:py-28 px-6 md:px-10">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-14 md:mb-20 space-y-4">
        <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/50">Guest Stories</span>
        <h2 className="font-serif text-fluid-h1 italic text-white leading-tight">Loved by Those Who Stay</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {TESTIMONIALS.map((t, i) => (
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.6 }}
            className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-[28px] p-8 md:p-10 flex flex-col"
          >
            <Quote className="w-8 h-8 text-white/30 mb-5" />
            <blockquote className="text-white/90 font-light italic leading-relaxed text-fluid-body flex-1">
              “{t.quote}”
            </blockquote>
            <div className="flex items-center gap-1 mt-6 mb-3">
              {[...Array(5)].map((_, s) => (
                <Star key={s} className="w-4 h-4 fill-amber-300 text-amber-300" />
              ))}
            </div>
            <figcaption>
              <p className="font-serif italic text-white text-lg">{t.name}</p>
              <p className="text-fluid-eyebrow font-bold uppercase tracking-widest text-white/50 mt-1">{t.origin}</p>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  </section>
);

// ── Gallery strip teaser ────────────────────────────────────────────────────
const STRIP_IMAGES = [
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559738501-fea3e1c5b6b9?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1000&auto=format&fit=crop',
];

interface GalleryStripProps {
  onViewGallery: () => void;
}
export const GalleryStrip = ({ onViewGallery }: GalleryStripProps) => (
  <section className="bg-white py-20 md:py-28 px-6 md:px-10">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12 md:mb-16 space-y-4">
        <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">A Glimpse Within</span>
        <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight tracking-tight">Moments in Frame</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {STRIP_IMAGES.map((src, i) => (
          <motion.button
            key={src}
            onClick={onViewGallery}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className={`group relative overflow-hidden rounded-[20px] aspect-square ${
              i === 0 ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <img
              src={src}
              alt="Gallery preview"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1200ms]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-natural-dark/0 group-hover:bg-natural-dark/20 transition-colors duration-500" />
          </motion.button>
        ))}
      </div>

      <div className="text-center mt-12">
        <button
          onClick={onViewGallery}
          className="inline-flex items-center gap-3 text-natural-primary font-bold uppercase tracking-[0.2em] text-[11px] border-b-2 border-natural-primary pb-1.5 hover:gap-4 transition-all"
        >
          Explore the Full Gallery <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </section>
);
