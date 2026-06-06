import React from 'react';
import { motion } from 'motion/react';

export const Hero = () => {
  return (
    <section className="relative h-[100vh] min-h-[600px] w-full overflow-hidden">
      {/* Background Image Wrapper */}
      <div className="absolute inset-0 z-0">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2 }}
          src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=2070&auto=format&fit=crop" 
          alt="Luxury Sanctuary" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-natural-dark/40 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 md:px-10 flex items-center">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <div className="flex items-center gap-4 text-white/70 text-[10px] md:text-[11px] uppercase font-bold tracking-[0.6em] mb-12">
              <span className="w-12 h-[1px] bg-white/40"></span>
              Welcome to Amadiya Reserves
            </div>

            <h1 className="font-serif text-fluid-hero italic text-white leading-[0.85] tracking-tighter mb-8 md:mb-12 drop-shadow-2xl">
              Sanctuary <br /> of Soul.
            </h1>
            
            <p className="text-white/90 font-light text-fluid-h3 leading-relaxed italic max-w-xl mb-12 md:mb-16 drop-shadow-lg">
              Experience curated luxury where architecture meets nature's raw beauty. Every moment is a crafted escape into the extraordinary.
            </p>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <button 
                onClick={() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full md:w-auto bg-white text-natural-dark px-12 py-6 rounded-full font-bold uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-natural-primary hover:text-white transition-all active:scale-95 whitespace-nowrap"
              >
                Explore Stays
              </button>
              
              <div className="flex items-center gap-4 text-white/60 text-[10px] uppercase font-bold tracking-widest hidden md:flex">
                <span className="w-8 h-[1px] bg-white/20"></span>
                Tropical Paradise & Wellness
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute bottom-12 right-12 hidden lg:block">
        <div className="w-32 h-32 border border-white/20 rounded-full flex items-center justify-center p-4">
          <div className="w-full h-full border border-white/40 rounded-full animate-spin-slow"></div>
        </div>
      </div>
    </section>
  );
};
