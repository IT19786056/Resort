import React from 'react';
import { motion } from 'motion/react';
import { Award, Heart, Globe, Map } from 'lucide-react';

export const AboutUs = () => {
  return (
    <div className="min-h-screen bg-natural-bg pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-primary">Our Legacy</span>
              <h1 className="font-serif text-6xl italic text-natural-dark leading-tight">Crafting Memories Since 1992</h1>
            </div>
            <p className="text-natural-muted leading-relaxed font-light text-lg">
              What started as a single boutique villa in Ahungalla has evolved into Sri Lanka's premiere luxury resort collection. At Ahsell Resorts, we don't just provide rooms; we curate experiences that linger in the soul.
            </p>
            <p className="text-natural-muted leading-relaxed font-light">
              Founded by visionaries who believed that true hospitality lies in the perfect balance of architectural grandeur and heartfelt service, we've remained true to our heritage while embracing modern luxury.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-6">
              <div className="space-y-2">
                <p className="text-4xl font-serif italic text-natural-primary">15+</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-natural-muted">Exquisite Locations</p>
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-serif italic text-natural-primary">50k+</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-natural-muted">Happy Guests</p>
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
                alt="Our Founder"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 bg-white p-10 rounded-[40px] shadow-xl max-w-[280px]">
              <p className="font-serif italic text-xl text-natural-dark mb-2">"True luxury is found in the moments of silence and service."</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-natural-primary">— Founder</p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {[
            { icon: Award, title: "Authenticity", desc: "Rooted in Sri Lankan culture and heritage." },
            { icon: Heart, title: "Service", desc: "Hospitality that feels like coming home." },
            { icon: Globe, title: "Sustainability", desc: "Committed to preserving our tropical paradise." },
            { icon: Map, title: "Exclusivity", desc: "Curated locations that offer unique perspectives." }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-10 rounded-[40px] border border-natural-accent hover:shadow-xl transition-all"
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
    </div>
  );
};
