import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, Star, ChevronRight, ArrowRight, Check,
  Coffee, Wifi, Waves, Sparkles, Car, Utensils,
} from 'lucide-react';
import { cld, cldSrcSet } from '../lib/cloudinary';
import { SkeletonCard } from './ui/SkeletonCard';

const SHOWCASE_IMAGE_SIZES = '(max-width: 1024px) 90vw, 45vw';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2400&auto=format&fit=crop';

// "Every stay includes" reassurance band — standard on luxury hotel room pages.
const INCLUSIONS = [
  { icon: Coffee, label: 'Daily Breakfast' },
  { icon: Wifi, label: 'High-Speed Wi-Fi' },
  { icon: Waves, label: 'Pool & Wellness' },
  { icon: Car, label: 'Airport Transfers' },
  { icon: Utensils, label: 'In-House Dining' },
  { icon: Sparkles, label: 'Daily Housekeeping' },
];

const FAQS = [
  { q: 'What are your check-in and check-out times?', a: 'Check-in is from 2:00 PM and check-out is until 12:00 noon. Early check-in and late check-out can be arranged on request, subject to availability.' },
  { q: 'Is breakfast included with every room?', a: 'Yes — a full breakfast is included with all stays, served à la carte or as a spread of island and continental favourites.' },
  { q: 'Are children welcome?', a: 'Absolutely. Most rooms accommodate an extra bed or cot, and our team is happy to tailor family-friendly touches ahead of your arrival.' },
  { q: 'What is your cancellation policy?', a: 'Reservations can be cancelled free of charge up to 7 days before arrival. Within 7 days, the first night is charged. Peak-season terms may vary.' },
];

interface AccommodationsPageProps {
  accommodations: any[];
  loading: boolean;
  onSelect: (item: any) => void;
  onBook: (e: React.MouseEvent, item: any) => void;
  onReserveCTA?: () => void;
}

// Editorial, full-width alternating showcase — the signature luxury-hotel room
// layout (large imagery + sparse copy) rather than a uniform card grid.
const RoomShowcase = ({ item, index, onSelect, onBook }: any) => {
  const amenities: string[] = Array.isArray(item.amenities) ? item.amenities : [];
  const disabled = item.isAvailable === false;
  const flip = index % 2 === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center"
    >
      {/* Image */}
      <div className={`relative ${flip ? 'lg:order-2' : ''}`}>
        <div
          onClick={disabled ? undefined : () => onSelect(item)}
          className={`relative rounded-[32px] md:rounded-[44px] overflow-hidden aspect-[4/3] shadow-2xl group ${disabled ? '' : 'cursor-pointer'}`}
        >
          <img
            src={cld(item.imageUrl, 'f_auto,q_auto,w_1200')}
            srcSet={cldSrcSet(item.imageUrl, [600, 900, 1200])}
            sizes={SHOWCASE_IMAGE_SIZES}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1400ms]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-fluid-eyebrow font-bold uppercase tracking-[0.2em] text-natural-primary border border-natural-accent">
            {item.type}
          </div>
          {item.rating ? (
            <div className="absolute top-5 right-5 bg-natural-dark/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span className="text-white text-xs font-bold">{Number(item.rating).toFixed(1)}</span>
            </div>
          ) : null}
          {disabled && (
            <div className="absolute inset-0 bg-natural-dark/40 flex items-center justify-center">
              <span className="bg-white text-natural-dark px-4 py-1.5 rounded-full font-bold uppercase text-[9px] tracking-widest shadow-xl">Currently Unavailable</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={`space-y-5 lg:px-2 ${flip ? 'lg:order-1' : ''}`}>
        <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">
          {String(index + 1).padStart(2, '0')} — {item.type}
        </span>
        <h3 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight tracking-tight">{item.name}</h3>
        <p className="text-natural-muted leading-relaxed font-light text-fluid-body">{item.description}</p>

        {/* Key facts */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
          {item.maxGuests ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-natural-dark">
              <Users className="w-4 h-4 text-natural-primary" /> Sleeps {item.maxGuests}
            </span>
          ) : null}
          {item.rating ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-natural-dark">
              <Star className="w-4 h-4 text-natural-primary" /> {Number(item.rating).toFixed(1)} Rating
            </span>
          ) : null}
        </div>

        {/* Amenity chips */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {amenities.slice(0, 5).map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-natural-accent bg-natural-cream text-natural-dark text-[11px] font-bold">
                <Check className="w-3.5 h-3.5 text-natural-primary" /> {a}
              </span>
            ))}
          </div>
        )}

        {/* Price + actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-5 mt-1 border-t border-natural-accent">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-natural-muted">From</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-serif italic text-natural-dark">LKR {Number(item.price).toLocaleString()}</span>
              <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.2em] text-natural-muted">/ night</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelect(item)}
              className="px-6 py-3.5 rounded-full border border-natural-accent text-natural-dark font-bold uppercase text-[10px] tracking-widest hover:border-natural-primary hover:text-natural-primary transition-all"
            >
              View Details
            </button>
            {!disabled && (
              <button
                onClick={(e) => onBook(e, item)}
                className="bg-natural-primary text-white px-7 py-3.5 rounded-full hover:bg-natural-dark transition-all shadow-lg active:scale-95 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"
              >
                Reserve <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const AccommodationsPage = ({ accommodations, loading, onSelect, onBook, onReserveCTA }: AccommodationsPageProps) => {
  const types = useMemo(() => {
    const set = new Set<string>();
    (accommodations || []).forEach((a) => { if (a.type) set.add(a.type); });
    return ['All', ...Array.from(set).sort()];
  }, [accommodations]);

  const [activeType, setActiveType] = useState('All');
  const visible = activeType === 'All'
    ? accommodations
    : accommodations.filter((a) => a.type === activeType);

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
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/60">Rooms, Suites &amp; Villas</span>
          <h1 className="font-serif text-fluid-hero italic text-white leading-tight">Our Accommodations</h1>
          <p className="text-white/80 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
            Every space here has been shaped by the land around it — designed not simply to shelter, but to
            immerse. Whether you seek the intimacy of a single room or the full breadth of a private villa,
            each stay is an experience in itself.
          </p>
        </motion.div>
      </section>

      {/* ── Catalogue (alternating showcase) ─────────────────────────────── */}
      <section className="bg-white py-16 md:py-24 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          {/* Type filter */}
          {types.length > 2 && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3 mb-14 md:mb-20">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-5 py-2.5 rounded-full font-bold uppercase text-[10px] tracking-[0.2em] transition-all border ${
                    activeType === t
                      ? 'bg-natural-primary text-white border-natural-primary shadow-lg shadow-natural-primary/20'
                      : 'bg-white text-natural-muted border-natural-accent hover:text-natural-dark hover:border-natural-primary/50'
                  }`}
                >
                  {t === 'All' ? 'All Stays' : `${t}s`}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : visible.length > 0 ? (
            <div className="space-y-20 md:space-y-32">
              {visible.map((item: any, index: number) => (
                <RoomShowcase key={item.id} item={item} index={index} onSelect={onSelect} onBook={onBook} />
              ))}
            </div>
          ) : (
            <div className="py-24 md:py-32 text-center">
              <p className="text-natural-muted text-xl italic font-light">
                No stays in this category just yet. Please check another category.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Every stay includes ──────────────────────────────────────────── */}
      <section className="bg-natural-cream py-16 md:py-24 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16 space-y-4">
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">Always Included</span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">Thoughtful Touches, Every Stay</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {INCLUSIONS.map((inc, i) => (
              <motion.div
                key={inc.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 6) * 0.07 }}
                className="bg-white rounded-[24px] border border-natural-accent p-6 flex flex-col items-center text-center gap-3 hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 rounded-2xl bg-natural-primary/10 flex items-center justify-center">
                  <inc.icon className="w-6 h-6 text-natural-primary" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-natural-dark leading-tight">{inc.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="bg-white py-16 md:py-24 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16 space-y-4">
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">Good to Know</span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">Before You Book</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {FAQS.map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 2) * 0.08 }}
                className="bg-natural-cream rounded-[24px] border border-natural-accent p-7 md:p-8"
              >
                <h3 className="font-serif text-lg md:text-xl italic text-natural-dark mb-3 leading-snug">{faq.q}</h3>
                <p className="text-sm text-natural-muted leading-relaxed font-light">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-natural-primary py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center space-y-7">
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/50">Ready When You Are</span>
          <h2 className="font-serif text-fluid-h1 italic text-white leading-tight">Reserve Your Sanctuary</h2>
          <p className="text-white/75 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
            Choose your dates, choose your space, and let us take care of the rest. Our concierge is on hand
            to tailor every detail of your island escape.
          </p>
          <button
            onClick={onReserveCTA}
            className="inline-flex items-center gap-3 bg-white text-natural-primary font-bold uppercase tracking-widest text-fluid-eyebrow px-10 py-5 rounded-full hover:bg-natural-cream transition-colors duration-300 shadow-lg"
          >
            Check Availability <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
