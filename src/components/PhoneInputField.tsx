import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface CountryCode {
  name: string;
  code: string;
  dial: string;
  emoji: string;
}

export const COUNTRIES: CountryCode[] = [
  { name: 'Sri Lanka', code: 'LK', dial: '+94', emoji: '🇱🇰' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', emoji: '🇬🇧' },
  { name: 'United States', code: 'US', dial: '+1', emoji: '🇺🇸' },
  { name: 'India', code: 'IN', dial: '+91', emoji: '🇮🇳' },
  { name: 'Australia', code: 'AU', dial: '+61', emoji: '🇦🇺' },
  { name: 'Canada', code: 'CA', dial: '+1', emoji: '🇨🇦' },
  { name: 'Germany', code: 'DE', dial: '+49', emoji: '🇩🇪' },
  { name: 'France', code: 'FR', dial: '+33', emoji: '🇫🇷' },
  { name: 'Maldives', code: 'MV', dial: '+960', emoji: '🇲🇻' },
  { name: 'Singapore', code: 'SG', dial: '+65', emoji: '🇸🇬' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', emoji: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', emoji: '🇸🇦' },
  { name: 'Russia', code: 'RU', dial: '+7', emoji: '🇷🇺' },
  { name: 'China', code: 'CN', dial: '+86', emoji: '🇨🇳' },
  { name: 'Japan', code: 'JP', dial: '+81', emoji: '🇯🇵' },
  { name: 'Switzerland', code: 'CH', dial: '+41', emoji: '🇨🇭' },
  { name: 'Italy', code: 'IT', dial: '+39', emoji: '🇮🇹' },
  { name: 'Spain', code: 'ES', dial: '+34', emoji: '🇪🇸' },
  { name: 'Netherlands', code: 'NL', dial: '+31', emoji: '🇳🇱' },
  { name: 'Sweden', code: 'SE', dial: '+46', emoji: '🇸🇪' },
  { name: 'Norway', code: 'NO', dial: '+47', emoji: '🇳🇴' },
  { name: 'Denmark', code: 'DK', dial: '+45', emoji: '🇩🇰' },
  { name: 'New Zealand', code: 'NZ', dial: '+64', emoji: '🇳🇿' },
  { name: 'Malaysia', code: 'MY', dial: '+60', emoji: '🇲🇾' },
  { name: 'Indonesia', code: 'ID', dial: '+62', emoji: '🇮🇩' },
  { name: 'Thailand', code: 'TH', dial: '+66', emoji: '🇹🇭' },
  { name: 'South Africa', code: 'ZA', dial: '+27', emoji: '🇿🇦' },
  { name: 'Brazil', code: 'BR', dial: '+55', emoji: '🇧🇷' },
  { name: 'Mexico', code: 'MX', dial: '+52', emoji: '🇲🇽' },
];

interface PhoneInputFieldProps {
  value: string;
  onChange: (fullValue: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export const PhoneInputField = ({
  value,
  onChange,
  disabled = false,
  required = false,
  id = 'phone-input-root'
}: PhoneInputFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to parse value into dial code & local number
  const parsePhoneValue = (val: string) => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return { dialCode: '+94', localNo: '' };
    }

    // Sort known codes by length descending to match longest first (+960 vs +9)
    const sortedCodes = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sortedCodes) {
      if (trimmed.startsWith(c.dial)) {
        // Safe split: find dial code and extract local part
        const localPart = trimmed.slice(c.dial.length).trim();
        return { dialCode: c.dial, localNo: localPart };
      }
    }

    // Fallback if no dial code matches but starts with +
    if (trimmed.startsWith('+')) {
      const matchSpace = trimmed.indexOf(' ');
      if (matchSpace !== -1) {
        return {
          dialCode: trimmed.slice(0, matchSpace),
          localNo: trimmed.slice(matchSpace + 1).trim()
        };
      }
    }

    // Default fallback
    return { dialCode: '+94', localNo: trimmed };
  };

  const { dialCode, localNo } = parsePhoneValue(value);

  // Get active selected country
  const currentCountry = COUNTRIES.find(c => c.dial === dialCode) || COUNTRIES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: CountryCode) => {
    onChange(`${country.dial} ${localNo}`);
    setIsOpen(false);
    setSearch('');
  };

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitizing local input to prevent alphabetic or illegal characters in phone numbers
    const cleanVal = e.target.value.replace(/[^0-9\s-()]/g, '');
    onChange(`${dialCode} ${cleanVal.trimLeft()}`);
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id={id} className="relative flex select-none text-xs" ref={dropdownRef}>
      {/* Country Code Trigger Button */}
      <button
        id={`${id}-trigger`}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-4 bg-natural-bg hover:bg-natural-accent/30 border border-natural-accent border-r-0 rounded-l-full text-natural-dark font-medium transition-colors disabled:opacity-75"
      >
        <span className="text-base leading-none">{currentCountry.emoji}</span>
        <span className="font-mono font-semibold">{currentCountry.dial}</span>
        <ChevronDown className="w-3.5 h-3.5 text-natural-muted" />
      </button>

      {/* Local Phone Input Field */}
      <input
        id={`${id}-phone-number-field`}
        type="tel"
        required={required}
        disabled={disabled}
        value={localNo}
        onChange={handleLocalNumberChange}
        placeholder="77 123 4567"
        className="w-full bg-natural-bg lg:bg-white border border-natural-accent rounded-r-full px-5 py-3 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium transition-all"
      />

      {/* Custom Searchable Dropdown Overlay */}
      {isOpen && (
        <div
          id={`${id}-dropdown-menu`}
          className="absolute top-full left-0 mt-2 w-72 bg-white border border-natural-accent rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col"
        >
          {/* Search Box */}
          <div className="p-3 border-b border-natural-accent flex items-center gap-2 bg-natural-bg/40">
            <Search className="w-4 h-4 text-natural-muted shrink-0" />
            <input
              id={`${id}-dropdown-search`}
              type="text"
              autoFocus
              placeholder="Search by country or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-xs outline-none text-natural-dark font-medium placeholder-natural-muted"
            />
          </div>

          {/* List of Countries */}
          <div className="max-h-56 overflow-y-auto divide-y divide-natural-accent/20">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-natural-muted italic text-[11px]">
                No match found
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.dial === dialCode;
                return (
                  <button
                    key={`${country.code}-${country.dial}`}
                    id={`${id}-country-item-${country.code.toLowerCase()}`}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-natural-bg/65 ${
                      isSelected ? 'bg-natural-primary/5 font-semibold text-natural-primary' : 'text-natural-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-lg leading-none shrink-0">{country.emoji}</span>
                      <span className="truncate">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-natural-muted">{country.dial}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-natural-primary shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
