import React from 'react';
import { Search, Instagram, Facebook, Twitter } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-natural-accent py-24 px-6 md:px-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20 text-natural-dark">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-3 mb-8 group">
            <div className="w-10 h-10 bg-natural-primary rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif text-3xl font-bold italic tracking-tighter">Ahsell.</span>
          </div>
          <p className="text-natural-muted text-sm leading-relaxed mb-8 font-light italic">
            Experience the harmony of sustainable luxury and untouched nature. Our holiday resort offers a sanctuary for the soul, crafted with intention and respect for our surroundings.
          </p>
          <div className="flex space-x-6">
            <SocialLink icon={<Instagram className="w-5 h-5" />} />
            <SocialLink icon={<Facebook className="w-5 h-5" />} />
            <SocialLink icon={<Twitter className="w-5 h-5" />} />
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 text-natural-primary">The Collection</h4>
          <ul className="space-y-4 md:space-y-6 text-xs font-bold uppercase tracking-widest text-natural-muted">
            <li><a href="#" className="hover:text-natural-primary transition-colors">Coastal Retreats</a></li>
            <li><a href="#" className="hover:text-natural-primary transition-colors">Island Villas</a></li>
            <li><a href="#" className="hover:text-natural-primary transition-colors">Safari Lodges</a></li>
            <li><a href="#" className="hover:text-natural-primary transition-colors">Urban Escapes</a></li>
          </ul>
        </div>

        <div>
           <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 text-natural-primary">Experience</h4>
           <ul className="space-y-4 md:space-y-6 text-xs font-bold uppercase tracking-widest text-natural-muted">
            <li><a href="#" className="hover:text-natural-primary transition-colors">Wellness & Spa</a></li>
            <li><a href="#" className="hover:text-natural-primary transition-colors">Culinary Journeys</a></li>
            <li><a href="#" className="hover:text-natural-primary transition-colors">Ocean Excursions</a></li>
            <li><a href="#" className="hover:text-natural-primary transition-colors">Private Villas</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-16 mt-20 border-t border-natural-accent flex flex-col md:flex-row justify-between items-center text-[10px] text-natural-muted uppercase tracking-[0.3em] font-bold">
        <p>© 2026 Ahsell Holiday Resort Group — Crafted with Intention</p>
        <div className="flex space-x-12 mt-8 md:mt-0 items-center">
          <a href="#" className="hover:text-natural-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-natural-primary transition-colors">Terms</a>
          <div className="flex gap-3 items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <span>System Online</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({ icon }: { icon: React.ReactNode }) => (
  <a href="#" className="w-10 h-10 border border-natural-accent rounded-full flex items-center justify-center text-natural-primary hover:bg-natural-primary hover:text-white hover:scale-110 transition-all duration-300">
    {icon}
  </a>
);
