import React from 'react';
import { XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const SectionLabel = ({ label }: { label: string }) => (
  <label className="block [font-size:10px] uppercase font-bold text-natural-muted mb-2 tracking-[0.2em]">{label}</label>
);

export const Input = ({ label, type = "text", value, onChange, ...props }: any) => (
  <div>
    <SectionLabel label={label} />
    <input 
      type={type}
      className="w-full bg-natural-bg rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark"
      value={value}
      onChange={e => onChange(e.target.value)}
      {...props}
    />
  </div>
);

export const Modal = ({ children, onClose, title }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-natural-dark/40 backdrop-blur-sm" 
    />
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="relative z-10 w-full max-w-2xl bg-white rounded-[40px] p-12 overflow-y-auto max-h-[90vh]"
    >
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-serif text-3xl italic text-natural-dark">{title}</h3>
        <button onClick={onClose}><XCircle className="w-8 h-8 text-natural-muted hover:text-natural-primary transition-colors" /></button>
      </div>
      {children}
    </motion.div>
  </div>
);
