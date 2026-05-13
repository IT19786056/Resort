import React from 'react';
import { motion } from 'motion/react';
import { Plane } from 'lucide-react';

interface LoadingPlaneProps {
  label?: string;
  fullScreen?: boolean;
}

export const LoadingPlane = ({ label = "Synchronizing Your Stay", fullScreen = true }: LoadingPlaneProps) => {
  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-[100] bg-natural-bg' : 'w-full py-20'} flex flex-col items-center justify-center overflow-hidden`}>
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Sky Circle */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 bg-natural-primary/5 rounded-full border border-natural-primary/10"
        />
        
        {/* Clouds Animation */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 60, opacity: 0 }}
            animate={{ 
              x: -60, 
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.7,
              ease: "linear"
            }}
            className="absolute h-1 bg-white rounded-full"
            style={{ 
              top: `${30 + (i * 20)}%`,
              width: `${20 + (i * 10)}px`
            }}
          />
        ))}

        {/* Orbiting Plane */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 p-4"
        >
          <div className="w-full h-full relative">
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 text-natural-primary"
            >
              <Plane className="w-6 h-6 rotate-90" />
            </motion.div>
          </div>
        </motion.div>

        {/* Center Dot */}
        <div className="w-2 h-2 bg-natural-primary rounded-full animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 space-y-2 text-center"
      >
        <p className="font-serif italic text-xl text-natural-dark">{label}</p>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 bg-natural-primary rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
