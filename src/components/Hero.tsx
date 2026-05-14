import React from 'react';
import { motion } from 'motion/react';

export const Hero = () => {
  return (
    <section className="relative px-4 md:px-10 pt-28 md:pt-40 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="relative h-auto min-h-[500px] md:h-[600px] flex flex-col lg:flex-row bg-white rounded-[32px] md:rounded-[60px] overflow-hidden shadow-2xl border border-natural-accent">
          {/* Image Part */}
          <div className="relative w-full lg:w-1/2 h-[300px] md:h-[400px] lg:h-full overflow-hidden">
            <motion.img 
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5 }}
              src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=2070&auto=format&fit=crop" 
              alt="Luxury Sanctuary" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-natural-dark/10" />
            
            <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 flex items-center gap-4 text-white text-[9px] md:text-[10px] uppercase font-bold tracking-[0.4em]">
              <span className="w-8 md:w-12 h-[1px] bg-white/40"></span>
              Tropical Paradise
            </div>
          </div>

          {/* Content Part */}
          <div className="w-full lg:w-1/2 bg-natural-accent flex flex-col justify-center p-8 md:p-16 lg:p-20 relative">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative z-10"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-natural-primary block mb-6 md:mb-10">Welcome to Ahsell</span>
              <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl italic text-natural-dark leading-[0.9] tracking-tighter mb-8">
                Sanctuary <br className="hidden md:block" /> of Soul.
              </h1>
              <div className="w-20 h-[1px] bg-natural-primary/30 mb-8 md:mb-10" />
              <p className="text-natural-muted font-light text-lg md:text-xl lg:text-2xl leading-relaxed italic max-w-lg">
                Experience curated luxury where architecture meets nature's raw beauty. Every moment is a crafted escape.
              </p>
              
              <div className="mt-12 md:mt-16 flex items-center gap-6">
                <button 
                  onClick={() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-natural-dark text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-natural-primary transition-all active:scale-95 whitespace-nowrap"
                >
                  Explore Stays
                </button>
              </div>
            </motion.div>
            
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
};
