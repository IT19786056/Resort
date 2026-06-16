import { motion } from 'motion/react';

interface LoadingPlaneProps {
  label?: string;
  fullScreen?: boolean;
}

export const LoadingPlane = ({ label = "Synchronizing Your Stay", fullScreen = true }: LoadingPlaneProps) => {
  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-[100] bg-natural-bg' : 'w-full py-20'} flex flex-col items-center justify-center overflow-hidden`}>
      {/* Breathing Monogram */}
      <motion.img
        src="/amadiya-mark.png"
        alt="Amadiya"
        animate={{ opacity: [0.25, 1, 0.25], scale: [0.96, 1, 0.96] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-28 h-auto select-none"
        draggable={false}
      />

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
