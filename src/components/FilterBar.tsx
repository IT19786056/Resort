import React from 'react';
import { Search, MapPin, Calendar } from 'lucide-react';
import { FilterState, Hotel } from '../types';

interface FilterBarProps {
  onFilterChange: (f: Partial<FilterState>) => void;
  currentFilter: FilterState;
  hotels: Hotel[];
}

export const FilterBar = ({ 
  onFilterChange, 
  currentFilter,
  hotels 
}: FilterBarProps) => {
  return (
    <div className="py-8 bg-natural-bg sticky top-20 z-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-full p-2 shadow-sm border border-natural-accent flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col lg:flex-row flex-1 lg:divide-x divide-natural-accent w-full">
            <div className="px-8 py-3 flex flex-col flex-1">
              <span className="text-[10px] uppercase font-bold text-natural-muted mb-1 flex items-center tracking-widest">
                <MapPin className="w-3 h-3 mr-2 text-natural-primary" /> Destination
              </span>
              <select 
                className="bg-transparent outline-none text-sm font-bold w-full text-natural-dark"
                value={currentFilter.location}
                onChange={(e) => onFilterChange({ location: e.target.value })}
              >
                <option value="All">All Locations</option>
                {Array.from(new Set(hotels.map(h => h.location))).filter(Boolean).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            
            <div className="px-8 py-3 flex flex-col flex-1">
              <span className="text-[10px] uppercase font-bold text-natural-muted mb-1 flex items-center tracking-widest">
                <Calendar className="w-3 h-3 mr-2 text-natural-primary" /> Check-In
              </span>
              <input 
                type="date" 
                className="bg-transparent outline-none text-sm font-bold w-full focus:text-natural-primary"
                value={currentFilter.checkIn.split('T')[0]}
                onChange={(e) => onFilterChange({ checkIn: e.target.value })}
              />
            </div>

            <div className="px-8 py-3 flex flex-col flex-1">
              <span className="text-[10px] uppercase font-bold text-natural-muted mb-1 flex items-center tracking-widest">
                <Calendar className="w-3 h-3 mr-2 text-natural-primary" /> Check-Out
              </span>
              <input 
                type="date" 
                className="bg-transparent outline-none text-sm font-bold w-full focus:text-natural-primary"
                value={currentFilter.checkOut.split('T')[0]}
                onChange={(e) => onFilterChange({ checkOut: e.target.value })}
              />
            </div>

            <div className="px-8 py-3 flex flex-col flex-1">
              <span className="text-[10px] uppercase font-bold text-natural-muted mb-1 tracking-widest">Type</span>
              <select 
                className="bg-transparent outline-none text-sm font-bold w-full"
                value={currentFilter.type}
                onChange={(e) => onFilterChange({ type: e.target.value })}
              >
                {['All', 'Villa', 'Suite', 'Room'].map(t => <option key={t} value={t}>{t === 'All' ? 'All Units' : t + 's'}</option>)}
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => {
              const section = document.getElementById('stays-list');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-16 h-16 bg-natural-primary rounded-full flex items-center justify-center text-white shadow-xl shrink-0 hover:bg-natural-dark transition-all active:scale-95 group"
          >
            <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
