import React from 'react';
import { motion } from 'motion/react';
import { MapPin, ArrowRight, Compass } from 'lucide-react';
import { Hotel } from '../types';
import { cld, cldSrcSet } from '../lib/cloudinary';

interface ExploreLocationsProps {
  hotels: Hotel[];
  onSelectHotel: (hotel: Hotel) => void;
}

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=2400&auto=format&fit=crop';

// Editorial "regions of the island" band — purely descriptive context that makes
// the page feel full even when a single-hotel domain has just one property.
const REGIONS = [
  {
    name: 'The Southern Coast',
    blurb: 'Golden surf beaches, turtle bays and palm-shaded lagoons where the day ends in colour.',
    image: 'https://images.unsplash.com/photo-1559738501-fea3e1c5b6b9?q=80&w=1600&auto=format&fit=crop',
  },
  {
    name: 'The Hill Country',
    blurb: 'Cool, misted highlands quilted with tea, waterfalls and trails into cloud forest.',
    image: 'https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?q=80&w=1600&auto=format&fit=crop',
  },
  {
    name: 'The Cultural Triangle',
    blurb: 'Ancient cities, rock fortresses and cave temples carved from millennia of history.',
    image: 'https://images.unsplash.com/photo-1588598198321-9735fd52455a?q=80&w=1600&auto=format&fit=crop',
  },
  {
    name: 'The Wild East',
    blurb: 'Untamed shorelines, world-class point breaks and reefs that few ever reach.',
    image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?q=80&w=1600&auto=format&fit=crop',
  },
];

export const ExploreLocations = ({ hotels, onSelectHotel }: ExploreLocationsProps) => {
  const single = hotels.length === 1;

  return (
    <div className="min-h-screen bg-natural-bg">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-40 pb-24 md:pt-52 md:pb-36 px-6 md:px-10">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-b from-natural-dark/65 via-natural-dark/50 to-natural-dark/80" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="relative max-w-4xl mx-auto text-center space-y-6"
        >
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/60">Our Destinations</span>
          <h1 className="font-serif text-fluid-hero italic text-white leading-tight">
            {single ? 'Find Us on the Island' : 'A Collection of Places to Belong'}
          </h1>
          <p className="text-white/80 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
            {single
              ? 'Discover where we sit on the map, what surrounds us, and why this corner of the island is worth the journey.'
              : 'Each of our properties is chosen for the world it opens onto — coast, country and culture, each with a character entirely its own.'}
          </p>
        </motion.div>
      </section>

      {/* ── Properties ───────────────────────────────────────────────────── */}
      <section className="bg-white py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 md:mb-20 space-y-4">
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">
              {single ? 'The Property' : 'Our Properties'}
            </span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">
              {single ? 'Where You’ll Be Staying' : 'Choose Your Corner of Paradise'}
            </h2>
          </div>

          {hotels.length === 0 ? (
            <div className="bg-natural-cream p-16 md:p-20 rounded-[40px] text-center border border-dashed border-natural-accent">
              <Compass className="w-10 h-10 text-natural-muted mx-auto mb-4" />
              <p className="font-serif italic text-xl text-natural-muted">Our destinations are being curated. Please check back soon.</p>
            </div>
          ) : (
            <div className={`grid gap-8 md:gap-12 ${single ? 'grid-cols-1 max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {hotels.map((hotel, index) => (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index % 3) * 0.1, duration: 0.7 }}
                  onClick={() => onSelectHotel(hotel)}
                  className="group bg-white rounded-[28px] overflow-hidden flex flex-col shadow-md border border-natural-accent hover:shadow-2xl transition-all duration-500 cursor-pointer"
                >
                  <div className={`w-full overflow-hidden relative ${single ? 'aspect-[16/9]' : 'aspect-[16/11]'} bg-natural-accent`}>
                    <img
                      src={cld(hotel.imageUrl, 'f_auto,q_auto,w_1000')}
                      srcSet={cldSrcSet(hotel.imageUrl, [500, 800, 1000])}
                      sizes="(max-width: 768px) 90vw, 33vw"
                      alt={hotel.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1600ms]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-natural-dark/70 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-6 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-white" />
                      <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.3em] text-white">{hotel.location}</span>
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="font-serif text-fluid-card-title italic text-natural-dark mb-3 group-hover:text-natural-primary transition-colors tracking-tight">{hotel.name}</h3>
                    <p className="text-natural-muted text-sm leading-relaxed font-light flex-1 line-clamp-4">
                      {hotel.description || 'A sanctuary shaped by its surroundings, where considered design meets the quiet luxury of the island.'}
                    </p>
                    <span className="inline-flex items-center gap-3 mt-6 text-natural-primary font-bold uppercase tracking-[0.2em] text-[11px] group-hover:gap-4 transition-all">
                      Discover <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Regions of the island ────────────────────────────────────────── */}
      <section className="bg-natural-cream py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 md:mb-20 space-y-4">
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">Beyond the Gates</span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">One Island, Endless Worlds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {REGIONS.map((region, i) => (
              <motion.div
                key={region.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="group relative rounded-[24px] overflow-hidden aspect-[3/4] shadow-md"
              >
                <img
                  src={region.image}
                  alt={region.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1400ms]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-natural-dark/85 via-natural-dark/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 space-y-2">
                  <h3 className="font-serif text-xl italic text-white">{region.name}</h3>
                  <p className="text-white/75 text-xs leading-relaxed font-light">{region.blurb}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
