import { motion } from 'motion/react';

export const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-[32px] overflow-hidden border border-natural-accent h-full flex flex-col">
      <div className="relative h-64 overflow-hidden">
        <div className="w-full h-full bg-natural-accent/50 animate-pulse" />
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div className="h-6 bg-natural-accent/50 rounded-full w-32 animate-pulse" />
          <div className="h-5 bg-natural-accent/50 rounded-full w-12 animate-pulse" />
        </div>
        
        <div className="h-4 bg-natural-accent/30 rounded-full w-24 mb-4 animate-pulse" />
        <div className="h-16 bg-natural-accent/20 rounded-xl w-full mb-6 animate-pulse" />
        
        <div className="mt-auto flex items-center justify-between">
          <div className="h-8 bg-natural-accent/50 rounded-full w-20 animate-pulse" />
          <div className="h-10 bg-natural-accent/70 rounded-full w-28 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
