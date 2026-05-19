import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose?: () => void;
  duration?: number;
}

export const Toast = ({ message, type = 'success', isVisible, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    if (isVisible && type !== 'loading' && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, type, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`
              flex items-center gap-4 p-4 rounded-[24px] shadow-2xl border backdrop-blur-md
              ${type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : 
                type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : 
                type === 'loading' ? 'bg-white/90 border-natural-accent text-natural-dark' :
                'bg-natural-bg/90 border-natural-accent text-natural-dark'}
            `}
          >
            <div className="flex-shrink-0">
              {type === 'success' && <CheckCircle className="w-6 h-6 text-green-500" />}
              {type === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
              {type === 'loading' && <Loader2 className="w-6 h-6 text-natural-primary animate-spin" />}
              {type === 'info' && <Info className="w-6 h-6 text-natural-primary" />}
            </div>
            
            <p className="font-bold text-sm tracking-tight">{message}</p>
            
            {type !== 'loading' && onClose && (
              <button 
                onClick={onClose}
                className="ml-auto p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <XCircle className="w-4 h-4 opacity-50" />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
