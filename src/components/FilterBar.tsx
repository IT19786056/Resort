import React, { useMemo } from 'react';
import { Search, MapPin, RotateCcw, Building2 } from 'lucide-react';
import { FilterState, Hotel, Accommodation } from '../types';
import { DatePickerInput } from './ui/DatePickerInput';

interface FilterBarProps {
  onFilterChange: (f: Partial<FilterState>) => void;
  currentFilter: FilterState;
  hotels: Hotel[];
  accommodations?: Accommodation[];
  onSearch?: () => void;
  onReset?: () => void;
}

export const FilterBar = ({
  onFilterChange,
  currentFilter,
  hotels,
  accommodations,
  onSearch,
  onReset
}: FilterBarProps) => {
  const getMinCheckInDate = () => {
    const now = new Date();
    const tenAM = new Date();
    tenAM.setHours(10, 0, 0, 0);
    const minDate = new Date();
    if (now.getTime() >= tenAM.getTime()) {
      minDate.setDate(now.getDate() + 1);
    }
    return `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;
  };

  const getMinCheckOutDate = (checkInStr: string) => {
    const base = checkInStr.split('T')[0] || getMinCheckInDate();
    const d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    (accommodations || []).forEach(a => { if (a.type) types.add(a.type); });
    return ['All', ...Array.from(types).sort()];
  }, [accommodations]);

  const minCheckIn = getMinCheckInDate();
  const checkInVal = currentFilter.checkIn.split('T')[0];
  const checkOutVal = currentFilter.checkOut.split('T')[0];
  const activeHotelId = currentFilter.hotelId || 'All';

  const hasActiveFilters =
    (activeHotelId !== 'All') ||
    currentFilter.type !== 'All' ||
    checkInVal !== '' ||
    checkOutVal !== '';

  return (
    <div id="filter-section" className="py-4 md:py-8 bg-transparent relative z-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="bg-natural-cream rounded-3xl md:rounded-full p-2 shadow-sm border border-natural-accent flex flex-col xl:flex-row items-center justify-between gap-2 md:gap-4">
          <div className="flex flex-col md:grid md:grid-cols-2 lg:flex lg:flex-row flex-1 lg:divide-x divide-natural-accent w-full">

            {/* Destination — hotel names */}
            <div className="px-6 md:px-8 py-2 md:py-3 flex flex-col flex-1">
              <span className="text-[10px] uppercase font-bold text-natural-muted mb-1 flex items-center tracking-widest">
                <MapPin className="w-3 h-3 mr-2 text-natural-primary" /> Destination
              </span>
              <select
                className="bg-transparent outline-none text-sm font-bold w-full text-natural-dark cursor-pointer"
                value={activeHotelId}
                onChange={(e) => onFilterChange({ hotelId: e.target.value })}
              >
                <option value="All">All Hotels</option>
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Check-In */}
            <div className="px-8 py-3 flex flex-col flex-1 relative overflow-visible">
              <DatePickerInput
                label="Check-In"
                value={checkInVal}
                min={minCheckIn}
                onChange={(v) => {
                  const updates: Partial<FilterState> = { checkIn: v };
                  if (v && checkOutVal && checkOutVal <= v) {
                    updates.checkOut = getMinCheckOutDate(v);
                  }
                  onFilterChange(updates);
                }}
              />
            </div>

            {/* Check-Out */}
            <div className="px-8 py-3 flex flex-col flex-1 relative overflow-visible">
              <DatePickerInput
                label="Check-Out"
                value={checkOutVal}
                min={checkInVal ? getMinCheckOutDate(checkInVal) : getMinCheckOutDate('')}
                onChange={(v) => onFilterChange({ checkOut: v })}
              />
            </div>

            {/* Unit Type — dynamic */}
            <div className="px-8 py-3 flex flex-col flex-1">
              <span className="text-[10px] uppercase font-bold text-natural-muted mb-1 flex items-center tracking-widest">
                <Building2 className="w-3 h-3 mr-2 text-natural-primary" /> Type
              </span>
              <select
                className="bg-transparent outline-none text-sm font-bold w-full cursor-pointer"
                value={currentFilter.type}
                onChange={(e) => onFilterChange({ type: e.target.value })}
              >
                {availableTypes.map(t => (
                  <option key={t} value={t}>
                    {t === 'All' ? 'All Units' : t + 's'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2 select-none">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { if (onReset) onReset(); }}
                className="h-12 px-6 bg-natural-accent/50 hover:bg-natural-accent rounded-full text-natural-primary font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 border border-natural-accent"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <button
              onClick={() => {
                if (onSearch) onSearch();
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
    </div>
  );
};
