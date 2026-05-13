import React from 'react';
import { motion } from 'motion/react';

export const Hero = () => {
  return (
    <section className="relative px-6 flex flex-col pt-36 pb-12 gap-10">
      <div className="relative h-[550px] w-full max-w-7xl mx-auto bg-natural-accent rounded-[60px] overflow-hidden flex items-center justify-center shadow-2xl">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5 }}
          src="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=2070&auto=format&fit=crop" 
          alt="Luxury Resort" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-natural-dark/30" />
        <div className="relative z-10 text-center px-10">
          <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1, ease: "easeOut" }}
          >
            <h1 className="font-serif text-5xl md:text-8xl italic text-white drop-shadow-2xl leading-none">
              Sanctuary of Soul.
            </h1>
            <p className="text-white/90 mt-8 font-light text-xl md:text-2xl tracking-wide max-w-2xl mx-auto italic">
              Experience curated luxury at Ahsell Resorts, where every moment is a piece of paradise.
            </p>
          </motion.div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/50 text-[10px] uppercase font-bold tracking-[0.4em]">
          <span className="w-12 h-[1px] bg-white/20"></span>
          Tropical Paradise
          <span className="w-12 h-[1px] bg-white/20"></span>
        </div>
      </div>
    </section>
  );
};
