import { motion } from 'motion/react';
import { Award, Heart, Globe, Map, ArrowRight } from 'lucide-react';

export const AboutUs = () => {
  return (
    <div className="min-h-screen bg-natural-bg">

      {/* Hero — blue */}
      <div className="bg-natural-primary pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="space-y-8"
          >
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/50">Our Legacy</span>
            <h1 className="font-serif text-fluid-hero italic text-white leading-tight">
              Where Sri Lanka's Soul<br />Becomes Your Story
            </h1>
            <p className="text-white/75 leading-relaxed font-light text-fluid-body max-w-3xl mx-auto">
              There is a particular kind of magic that happens when a place feels both completely foreign and
              deeply familiar. A warm breeze carrying the scent of cinnamon through an open veranda. Golden
              light pooling across a private infinity pool at dusk. A host who smiles and already knows your
              name. At Amadiya Leisure, we have spent years engineering that moment — for every type of
              traveler, across every breathtaking corner of Sri Lanka.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Wave divider blue → white */}
      <div className="bg-natural-primary" style={{ marginBottom: '-1px' }}>
        <svg viewBox="0 0 1440 80" className="w-full block" preserveAspectRatio="none">
          <path fill="#ffffff" d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>

      {/* Story section — white */}
      <div className="bg-white py-20 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 md:space-y-8"
            >
              <div className="space-y-4">
                <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">A Bond. A Belief. A Beginning.</span>
                <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">
                  Built on Family.<br />Rooted in Sri Lanka.
                </h2>
              </div>
              <p className="text-natural-muted leading-relaxed font-light text-fluid-body">
                Amadiya Leisure was not born from a business plan. It was born from a belief shared between
                a father and his son: that the finest hospitality in the world should feel like a gift, not a
                transaction. Together, we set out to create something Sri Lanka had never quite seen — a
                curated collection of properties so diverse in character, yet so unified in soul, that every
                traveler could find their own perfect expression of paradise here.
              </p>
              <p className="text-natural-muted leading-relaxed font-light text-fluid-body">
                We are not a chain. We are a family. And every property we manage carries that distinction in
                its very walls — in the handpicked details, the locally inspired design, the staff who welcome
                you not merely as guests, but as cherished arrivals to something rare.
              </p>
              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="space-y-2">
                  <p className="text-4xl font-serif italic text-natural-primary">15+</p>
                  <p className="text-fluid-eyebrow font-bold uppercase tracking-widest text-natural-muted">Exquisite Locations</p>
                </div>
                <div className="space-y-2">
                  <p className="text-4xl font-serif italic text-natural-primary">50k+</p>
                  <p className="text-fluid-eyebrow font-bold uppercase tracking-widest text-natural-muted">Happy Guests</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-[60px] overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1544124499-58912cbddaad?q=80&w=2000&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                  alt="Our Founders"
                />
              </div>
              <div className="absolute xl:-bottom-10 xl:-right-10 sm:-bottom-6 sm:-right-6 bottom-4 right-4 bg-natural-primary p-6 sm:p-10 rounded-[24px] sm:rounded-[40px] shadow-xl max-w-[200px] sm:max-w-[280px]">
                <p className="font-serif italic text-sm sm:text-xl text-white mb-2">
                  "True luxury is found in the moments of silence and service."
                </p>
                <p className="text-fluid-eyebrow font-bold uppercase tracking-widest text-white/50">— Our Founders</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Properties section — cream */}
      <div className="bg-natural-cream py-20 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-primary">Our Spaces</span>
            <h2 className="font-serif text-fluid-h1 italic text-natural-dark leading-tight">
              Three Worlds. One Standard of Excellence.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                vibe: 'Energy & Indulgence',
                title: 'Full-Service Hotels',
                desc: 'For the traveler who thrives on energy and indulgence. Our hotels pulse with life — rooftop restaurants with panoramic coastline views, spa sanctuaries drawing on ancient Ayurvedic tradition, and a vibrant atmosphere that rewards those who want to be at the centre of it all.',
                image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2000&auto=format&fit=crop',
              },
              {
                vibe: 'Sovereign Silence',
                title: 'Luxury Private Villas',
                desc: 'For those who seek the world entirely on their own terms. Stone and timber retreats with infinity pools above jungle canopies or open ocean, attended by a dedicated team who serve you in blissful, unhurried silence. Here, the only itinerary is the one you write yourself.',
                image: 'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?q=80&w=2000&auto=format&fit=crop',
              },
              {
                vibe: 'Magic in Simplicity',
                title: 'Cozy Bungalows',
                desc: 'For the soul that finds magic in simplicity. Nestled into Sri Lanka\'s lush countryside or beside a quiet bay, our bungalows offer the warmth of a home with none of its obligations. Wake to birdsong. Fall asleep to rain on a teak roof. Discover that sometimes, the smallest spaces hold the largest memories.',
                image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2000&auto=format&fit=crop',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group bg-white rounded-[40px] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-8 space-y-3">
                  <span className="text-fluid-eyebrow font-bold uppercase tracking-widest text-natural-primary">{item.vibe}</span>
                  <h3 className="font-serif text-fluid-card-title italic text-natural-dark">{item.title}</h3>
                  <p className="text-natural-muted text-xs leading-relaxed font-light">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Values section — white */}
      <div className="bg-white py-20 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {[
            { icon: Award, title: 'Authenticity', desc: 'Rooted in Sri Lankan culture and heritage, every detail reflects the true soul of the island.' },
            { icon: Heart, title: 'Service', desc: 'Hospitality that feels like coming home — warm, attentive, and genuinely personal.' },
            { icon: Globe, title: 'Sustainability', desc: 'Committed to preserving our tropical paradise for the generations who will follow.' },
            { icon: Map, title: 'Exclusivity', desc: 'Curated locations that offer perspectives you simply cannot find anywhere else.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-natural-cream p-10 rounded-[40px] border border-natural-accent hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 bg-natural-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <item.icon className="w-6 h-6 text-natural-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-natural-dark italic mb-3">{item.title}</h3>
              <p className="text-xs text-natural-muted leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Wave divider white → blue */}
      <div className="bg-white" style={{ marginBottom: '-1px' }}>
        <svg viewBox="0 0 1440 80" className="w-full block" preserveAspectRatio="none">
          <path fill="#1D4ED8" d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>

      {/* CTA — blue */}
      <div className="bg-natural-primary py-24 px-6 md:px-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/50">Begin Your Journey</span>
            <h2 className="font-serif text-fluid-h1 italic text-white leading-tight">
              Your Perfect Escape Is Waiting
            </h2>
            <p className="text-white/75 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
              Whether you are drawn to the vibrant pulse of a full-service hotel, the sovereign silence of a
              private villa, or the grounded charm of a hidden bungalow — Amadiya Leisure holds the key.
              Sri Lanka is vast and endlessly surprising. Let us show you the part of it that was always
              meant for you.
            </p>
            <button className="inline-flex items-center gap-3 bg-white text-natural-primary font-bold uppercase tracking-widest text-fluid-eyebrow px-10 py-5 rounded-full hover:bg-natural-cream transition-colors duration-300 shadow-lg">
              Find Your Stay
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>

    </div>
  );
};
