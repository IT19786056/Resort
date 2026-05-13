import React from 'react';
import { motion } from 'motion/react';
import { Hotel } from '../types';
import { MapPin, Users, Heart, Star, ChevronRight } from 'lucide-react';

interface WeddingsEventsProps {
  venues: Hotel[];
  onSelectVenue: (hotelId: string) => void;
}

export const WeddingsEvents = ({ venues, onSelectVenue }: WeddingsEventsProps) => {
  return (
    <div className="min-h-screen bg-natural-bg pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-primary">Forever Starts Here</span>
              <h1 className="font-serif text-6xl italic text-natural-dark leading-tight">Weddings & Exclusive Events</h1>
            </div>
            <p className="text-natural-muted leading-relaxed font-light text-lg">
              Experience the perfect union of tropical elegance and sophisticated celebration. Our collection of banquet halls provides the ultimate backdrop for your most cherished moments.
            </p>
            <div className="flex gap-12">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-natural-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-natural-dark">Bespoke Decor</span>
              </div>
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-natural-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-natural-dark">Gourmet Catering</span>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[60px] overflow-hidden aspect-video shadow-2xl"
          >
            <img 
              src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop" 
              className="w-full h-full object-cover" 
              alt="Wedding Celebration"
            />
          </motion.div>
        </div>

        <div className="space-y-12">
          <div className="flex items-end justify-between border-b border-natural-accent pb-8">
            <h2 className="font-serif text-3xl italic text-natural-dark">Available Venues</h2>
            <p className="text-xs text-natural-muted uppercase font-bold tracking-widest">{venues.length} Hall Locations</p>
          </div>

          {venues.length === 0 ? (
            <div className="bg-white p-20 rounded-[48px] text-center border border-dashed border-natural-accent">
              <p className="font-serif italic text-2xl text-natural-muted">No banquet venues currently available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {venues.map((venue, i) => (
                <motion.div
                  key={venue.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-[48px] overflow-hidden border border-natural-accent hover:shadow-2xl transition-all group"
                >
                  <div className="h-64 relative overflow-hidden">
                    <img src={venue.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                       <Users className="w-3 h-3 text-natural-primary" />
                       <span className="text-[9px] font-bold uppercase tracking-widest text-natural-dark">Up to 500 Guests</span>
                    </div>
                  </div>
                  <div className="p-10 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 text-natural-primary mb-2">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{venue.location}</span>
                      </div>
                      <h3 className="font-serif text-2xl italic text-natural-dark">{venue.name}</h3>
                    </div>
                    <p className="text-xs text-natural-muted leading-relaxed line-clamp-3 font-light">
                      {venue.description || "Sophisticated space designed for grand celebrations and intimate gatherings alike."}
                    </p>
                    <button 
                      onClick={() => onSelectVenue(venue.id)}
                      className="w-full border border-natural-accent py-4 rounded-full font-bold uppercase text-[9px] tracking-[0.2em] group-hover:bg-natural-primary group-hover:text-white group-hover:border-natural-primary transition-all flex items-center justify-center gap-2"
                    >
                      Enquire for Events <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
