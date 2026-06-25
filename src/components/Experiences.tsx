import React from 'react';
import { motion } from 'motion/react';
import {
  Bike, Mountain, Waves, Fish, Compass, Leaf,
  Utensils, Camera, Droplets, Sun, Wind, ArrowRight, Clock, Gauge,
} from 'lucide-react';

export interface Experience {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  duration: string;
  intensity: 'Easy' | 'Moderate' | 'Challenging';
  icon: React.ComponentType<{ className?: string }>;
}

// Curated island adventures. Exported so the Home page can surface a teaser
// strip without duplicating the data.
export const EXPERIENCES: Experience[] = [
  {
    id: 'cycling',
    title: 'Village & Paddy-Field Cycling',
    category: 'On Land',
    description:
      'Pedal along sun-warmed bunds between emerald paddy fields, pausing at roadside kades for king coconut and stopping to watch egrets lift from the water. A gentle window into rural island life.',
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=2000&auto=format&fit=crop',
    duration: 'Half day',
    intensity: 'Easy',
    icon: Bike,
  },
  {
    id: 'hiking',
    title: 'Highland Treks & Knuckles Trails',
    category: 'On Land',
    description:
      'Climb misty ridgelines through cloud forest and cardamom plantations to viewpoints that fall away into endless valleys. Our guides know every hidden waterfall along the way.',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2000&auto=format&fit=crop',
    duration: 'Full day',
    intensity: 'Challenging',
    icon: Mountain,
  },
  {
    id: 'surfing',
    title: 'Sunrise Surf Sessions',
    category: 'In Water',
    description:
      'Catch glassy point breaks at first light with a private instructor, then return to a beachside breakfast. Lessons shaped to your level, from first wave to confident lines.',
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=2000&auto=format&fit=crop',
    duration: '2–3 hours',
    intensity: 'Moderate',
    icon: Waves,
  },
  {
    id: 'diving',
    title: 'Coral Reef Diving & Snorkeling',
    category: 'In Water',
    description:
      'Slip beneath the surface into warm, turquoise water alive with parrotfish, turtles and coral gardens. Guided dives and snorkel drifts for every certification level.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2000&auto=format&fit=crop',
    duration: 'Half day',
    intensity: 'Moderate',
    icon: Fish,
  },
  {
    id: 'safari',
    title: 'Leopard & Elephant Safari',
    category: 'Wild',
    description:
      'Track leopard, sloth bear and herds of wild elephant across golden grassland at dawn. A naturalist rides with you, reading the bush and timing every sighting.',
    image: 'https://images.unsplash.com/photo-1547970810-dc1eac37d174?q=80&w=2000&auto=format&fit=crop',
    duration: 'Full day',
    intensity: 'Easy',
    icon: Compass,
  },
  {
    id: 'whales',
    title: 'Whale & Dolphin Watching',
    category: 'In Water',
    description:
      'Head out across a calm morning sea in search of blue whales and spinner-dolphin pods. The deep water off the southern coast is one of the world’s great cetacean theatres.',
    image: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?q=80&w=2000&auto=format&fit=crop',
    duration: 'Half day',
    intensity: 'Easy',
    icon: Droplets,
  },
  {
    id: 'tea',
    title: 'Tea-Country Plantation Walks',
    category: 'On Land',
    description:
      'Wander manicured hillsides of tea, learn the craft from leaf to cup in a working factory, and take high tea on a colonial verandah wrapped in mountain air.',
    image: 'https://images.unsplash.com/photo-1582126892906-5ba111b4c1c6?q=80&w=2000&auto=format&fit=crop',
    duration: 'Half day',
    intensity: 'Easy',
    icon: Leaf,
  },
  {
    id: 'kayaking',
    title: 'Mangrove & River Kayaking',
    category: 'In Water',
    description:
      'Glide silently through tunnels of mangrove and out onto mirror-still lagoons, kingfishers darting overhead. A serene paddle suited to all ages and abilities.',
    image: 'https://images.unsplash.com/photo-1604537466158-719b1972feb8?q=80&w=2000&auto=format&fit=crop',
    duration: '2–3 hours',
    intensity: 'Moderate',
    icon: Wind,
  },
  {
    id: 'cooking',
    title: 'Island Culinary Journeys',
    category: 'Culture',
    description:
      'Shop a morning market with our chef, then grind spices and coax a true rice-and-curry feast from a clay pot. The flavours of the island, learned by hand.',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2000&auto=format&fit=crop',
    duration: '3–4 hours',
    intensity: 'Easy',
    icon: Utensils,
  },
  {
    id: 'heritage',
    title: 'Ancient Heritage Trails',
    category: 'Culture',
    description:
      'Stand before rock fortresses, cave temples and frescoes older than memory. A private historian turns weathered stone into living story.',
    image: 'https://images.unsplash.com/photo-1588598198321-9735fd52455a?q=80&w=2000&auto=format&fit=crop',
    duration: 'Full day',
    intensity: 'Moderate',
    icon: Camera,
  },
  {
    id: 'yoga',
    title: 'Sunrise Yoga & Ayurveda',
    category: 'Wellness',
    description:
      'Greet the day with breath and movement on an open deck, then surrender to a centuries-old Ayurvedic ritual designed to restore balance from the inside out.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=2000&auto=format&fit=crop',
    duration: '1–2 hours',
    intensity: 'Easy',
    icon: Sun,
  },
  {
    id: 'catamaran',
    title: 'Sunset Catamaran Cruise',
    category: 'In Water',
    description:
      'Sail into a burning horizon with a cocktail in hand as the coastline glows gold and the first stars appear. The most graceful way to close a day on the island.',
    image: 'https://images.unsplash.com/photo-1500627964684-141351970a7f?q=80&w=2000&auto=format&fit=crop',
    duration: '2 hours',
    intensity: 'Easy',
    icon: Compass,
  },
];

const INTENSITY_STYLES: Record<Experience['intensity'], string> = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Moderate: 'bg-amber-50 text-amber-700 border-amber-100',
  Challenging: 'bg-rose-50 text-rose-700 border-rose-100',
};

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2400&auto=format&fit=crop';

interface ExperiencesProps {
  onReserve?: () => void;
}

export const Experiences = ({ onReserve }: ExperiencesProps) => {
  const featured = EXPERIENCES.slice(0, 3);
  const rest = EXPERIENCES.slice(3);

  return (
    <div className="min-h-screen bg-natural-bg">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-40 pb-24 md:pt-52 md:pb-36 px-6 md:px-10">
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
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/60">
            Curated by Our Island Experts
          </span>
          <h1 className="font-serif text-fluid-hero italic text-white leading-tight">
            Experiences That Stay<br />Long After You Leave
          </h1>
          <p className="text-white/80 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
            Beyond the comfort of your room lies an island of astonishing variety — surf-washed coasts,
            misted highlands, ancient cities and wild jungle. Every adventure below is privately guided
            and effortlessly arranged by our team.
          </p>
        </motion.div>
      </section>

      {/* ── Signature adventures (alternating feature rows) ──────────────── */}
      <section className="bg-white py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24 space-y-4">
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">Signature Adventures</span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">The Ones You’ll Talk About</h2>
          </div>

          <div className="space-y-20 md:space-y-32">
            {featured.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.7 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center"
              >
                <div className={`relative rounded-[32px] md:rounded-[48px] overflow-hidden aspect-[4/3] shadow-2xl group ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <img
                    src={exp.image}
                    alt={exp.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1200ms]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-5 left-5 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full">
                    <exp.icon className="w-4 h-4 text-natural-primary" />
                    <span className="text-fluid-eyebrow font-bold uppercase tracking-widest text-natural-dark">{exp.category}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">{exp.title}</h3>
                  <p className="text-natural-muted leading-relaxed font-light text-fluid-body">{exp.description}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-natural-accent text-natural-dark text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-natural-primary" /> {exp.duration}
                    </span>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold ${INTENSITY_STYLES[exp.intensity]}`}>
                      <Gauge className="w-3.5 h-3.5" /> {exp.intensity}
                    </span>
                  </div>
                  <button
                    onClick={onReserve}
                    className="inline-flex items-center gap-3 text-natural-primary font-bold uppercase tracking-[0.2em] text-[11px] border-b-2 border-natural-primary pb-1.5 hover:gap-4 transition-all"
                  >
                    Arrange This Experience <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Full collection grid ─────────────────────────────────────────── */}
      <section className="bg-natural-cream py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 md:mb-20 space-y-4">
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">The Full Collection</span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">More Ways to Lose the Day</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {rest.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1, duration: 0.6 }}
                className="group bg-white rounded-[28px] overflow-hidden border border-natural-accent shadow-md hover:shadow-2xl transition-all duration-500 flex flex-col"
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <img
                    src={exp.image}
                    alt={exp.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1200ms]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-natural-dark/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center">
                    <exp.icon className="w-5 h-5 text-natural-primary" />
                  </div>
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <span className="text-fluid-eyebrow font-bold uppercase tracking-widest text-natural-primary mb-2">{exp.category}</span>
                  <h3 className="font-serif text-fluid-card-title italic text-natural-dark mb-3 group-hover:text-natural-primary transition-colors">{exp.title}</h3>
                  <p className="text-natural-muted text-sm leading-relaxed font-light flex-1">{exp.description}</p>
                  <div className="flex items-center gap-3 mt-6 pt-5 border-t border-natural-bg">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-natural-muted">
                      <Clock className="w-3.5 h-3.5 text-natural-primary" /> {exp.duration}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${INTENSITY_STYLES[exp.intensity]}`}>
                      {exp.intensity}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section className="bg-natural-primary py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center space-y-7">
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/50">Your Itinerary, Effortless</span>
          <h2 className="font-serif text-fluid-h1 italic text-white leading-tight">Let Us Build Your Days</h2>
          <p className="text-white/75 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
            Tell us what moves you — adrenaline, stillness, culture or all three — and our concierge will
            weave these experiences around your stay. Reserve a room and the island opens up.
          </p>
          <button
            onClick={onReserve}
            className="inline-flex items-center gap-3 bg-white text-natural-primary font-bold uppercase tracking-widest text-fluid-eyebrow px-10 py-5 rounded-full hover:bg-natural-cream transition-colors duration-300 shadow-lg"
          >
            Reserve Your Stay <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
