import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';

export const Newsletter = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitted(true);
  };

  return (
    <>
      {/* Wave divider white → blue */}
      <div className="bg-white" style={{ marginBottom: '-1px' }}>
        <svg viewBox="0 0 1440 80" className="w-full block" preserveAspectRatio="none">
          <path fill="#1B1D36" d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>

      {/* Newsletter — blue */}
      <div className="bg-natural-primary py-24 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-white/50">Stay In The Loop</span>
            <h2 className="font-serif text-fluid-h1 italic text-white leading-tight">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-white/75 leading-relaxed font-light text-fluid-body max-w-2xl mx-auto">
              Subscribe to our newsletter and get updated on our latest information and deals.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 pt-4"
              >
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <p className="text-white font-light italic text-fluid-body">
                  Thank you, {name.split(' ')[0]}! You're now subscribed.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row items-stretch gap-3 max-w-xl mx-auto pt-4"
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                  className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-full px-6 py-4 text-sm font-light outline-none focus:bg-white/15 focus:border-white/40 transition-all"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your Email"
                  required
                  className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-full px-6 py-4 text-sm font-light outline-none focus:bg-white/15 focus:border-white/40 transition-all"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-3 bg-white text-natural-primary font-bold uppercase tracking-widest text-fluid-eyebrow px-8 py-4 rounded-full hover:bg-natural-cream transition-colors duration-300 shadow-lg whitespace-nowrap"
                >
                  Subscribe
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};
