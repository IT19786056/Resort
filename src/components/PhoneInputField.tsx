import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface CountryCode {
  name: string;
  code: string;
  dial: string;
  emoji: string;
}

export const COUNTRIES: CountryCode[] = [
  // Default / most common for this resort
  { name: 'Sri Lanka', code: 'LK', dial: '+94', emoji: '🇱🇰' },
  { name: 'Maldives', code: 'MV', dial: '+960', emoji: '🇲🇻' },
  { name: 'India', code: 'IN', dial: '+91', emoji: '🇮🇳' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', emoji: '🇬🇧' },
  { name: 'United States', code: 'US', dial: '+1', emoji: '🇺🇸' },
  { name: 'Australia', code: 'AU', dial: '+61', emoji: '🇦🇺' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', emoji: '🇦🇪' },
  // Africa
  { name: 'Algeria', code: 'DZ', dial: '+213', emoji: '🇩🇿' },
  { name: 'Angola', code: 'AO', dial: '+244', emoji: '🇦🇴' },
  { name: 'Benin', code: 'BJ', dial: '+229', emoji: '🇧🇯' },
  { name: 'Botswana', code: 'BW', dial: '+267', emoji: '🇧🇼' },
  { name: 'Burkina Faso', code: 'BF', dial: '+226', emoji: '🇧🇫' },
  { name: 'Burundi', code: 'BI', dial: '+257', emoji: '🇧🇮' },
  { name: 'Cameroon', code: 'CM', dial: '+237', emoji: '🇨🇲' },
  { name: 'Cape Verde', code: 'CV', dial: '+238', emoji: '🇨🇻' },
  { name: 'Central African Republic', code: 'CF', dial: '+236', emoji: '🇨🇫' },
  { name: 'Chad', code: 'TD', dial: '+235', emoji: '🇹🇩' },
  { name: 'Comoros', code: 'KM', dial: '+269', emoji: '🇰🇲' },
  { name: 'Congo', code: 'CG', dial: '+242', emoji: '🇨🇬' },
  { name: 'DR Congo', code: 'CD', dial: '+243', emoji: '🇨🇩' },
  { name: 'Djibouti', code: 'DJ', dial: '+253', emoji: '🇩🇯' },
  { name: 'Egypt', code: 'EG', dial: '+20', emoji: '🇪🇬' },
  { name: 'Equatorial Guinea', code: 'GQ', dial: '+240', emoji: '🇬🇶' },
  { name: 'Eritrea', code: 'ER', dial: '+291', emoji: '🇪🇷' },
  { name: 'Eswatini', code: 'SZ', dial: '+268', emoji: '🇸🇿' },
  { name: 'Ethiopia', code: 'ET', dial: '+251', emoji: '🇪🇹' },
  { name: 'Gabon', code: 'GA', dial: '+241', emoji: '🇬🇦' },
  { name: 'Gambia', code: 'GM', dial: '+220', emoji: '🇬🇲' },
  { name: 'Ghana', code: 'GH', dial: '+233', emoji: '🇬🇭' },
  { name: 'Guinea', code: 'GN', dial: '+224', emoji: '🇬🇳' },
  { name: 'Guinea-Bissau', code: 'GW', dial: '+245', emoji: '🇬🇼' },
  { name: 'Ivory Coast', code: 'CI', dial: '+225', emoji: '🇨🇮' },
  { name: 'Kenya', code: 'KE', dial: '+254', emoji: '🇰🇪' },
  { name: 'Lesotho', code: 'LS', dial: '+266', emoji: '🇱🇸' },
  { name: 'Liberia', code: 'LR', dial: '+231', emoji: '🇱🇷' },
  { name: 'Libya', code: 'LY', dial: '+218', emoji: '🇱🇾' },
  { name: 'Madagascar', code: 'MG', dial: '+261', emoji: '🇲🇬' },
  { name: 'Malawi', code: 'MW', dial: '+265', emoji: '🇲🇼' },
  { name: 'Mali', code: 'ML', dial: '+223', emoji: '🇲🇱' },
  { name: 'Mauritania', code: 'MR', dial: '+222', emoji: '🇲🇷' },
  { name: 'Mauritius', code: 'MU', dial: '+230', emoji: '🇲🇺' },
  { name: 'Morocco', code: 'MA', dial: '+212', emoji: '🇲🇦' },
  { name: 'Mozambique', code: 'MZ', dial: '+258', emoji: '🇲🇿' },
  { name: 'Namibia', code: 'NA', dial: '+264', emoji: '🇳🇦' },
  { name: 'Niger', code: 'NE', dial: '+227', emoji: '🇳🇪' },
  { name: 'Nigeria', code: 'NG', dial: '+234', emoji: '🇳🇬' },
  { name: 'Rwanda', code: 'RW', dial: '+250', emoji: '🇷🇼' },
  { name: 'São Tomé and Príncipe', code: 'ST', dial: '+239', emoji: '🇸🇹' },
  { name: 'Senegal', code: 'SN', dial: '+221', emoji: '🇸🇳' },
  { name: 'Seychelles', code: 'SC', dial: '+248', emoji: '🇸🇨' },
  { name: 'Sierra Leone', code: 'SL', dial: '+232', emoji: '🇸🇱' },
  { name: 'Somalia', code: 'SO', dial: '+252', emoji: '🇸🇴' },
  { name: 'South Africa', code: 'ZA', dial: '+27', emoji: '🇿🇦' },
  { name: 'South Sudan', code: 'SS', dial: '+211', emoji: '🇸🇸' },
  { name: 'Sudan', code: 'SD', dial: '+249', emoji: '🇸🇩' },
  { name: 'Tanzania', code: 'TZ', dial: '+255', emoji: '🇹🇿' },
  { name: 'Togo', code: 'TG', dial: '+228', emoji: '🇹🇬' },
  { name: 'Tunisia', code: 'TN', dial: '+216', emoji: '🇹🇳' },
  { name: 'Uganda', code: 'UG', dial: '+256', emoji: '🇺🇬' },
  { name: 'Zambia', code: 'ZM', dial: '+260', emoji: '🇿🇲' },
  { name: 'Zimbabwe', code: 'ZW', dial: '+263', emoji: '🇿🇼' },
  // Americas
  { name: 'Antigua and Barbuda', code: 'AG', dial: '+1268', emoji: '🇦🇬' },
  { name: 'Argentina', code: 'AR', dial: '+54', emoji: '🇦🇷' },
  { name: 'Bahamas', code: 'BS', dial: '+1242', emoji: '🇧🇸' },
  { name: 'Barbados', code: 'BB', dial: '+1246', emoji: '🇧🇧' },
  { name: 'Belize', code: 'BZ', dial: '+501', emoji: '🇧🇿' },
  { name: 'Bolivia', code: 'BO', dial: '+591', emoji: '🇧🇴' },
  { name: 'Brazil', code: 'BR', dial: '+55', emoji: '🇧🇷' },
  { name: 'Canada', code: 'CA', dial: '+1', emoji: '🇨🇦' },
  { name: 'Chile', code: 'CL', dial: '+56', emoji: '🇨🇱' },
  { name: 'Colombia', code: 'CO', dial: '+57', emoji: '🇨🇴' },
  { name: 'Costa Rica', code: 'CR', dial: '+506', emoji: '🇨🇷' },
  { name: 'Cuba', code: 'CU', dial: '+53', emoji: '🇨🇺' },
  { name: 'Dominica', code: 'DM', dial: '+1767', emoji: '🇩🇲' },
  { name: 'Dominican Republic', code: 'DO', dial: '+1809', emoji: '🇩🇴' },
  { name: 'Ecuador', code: 'EC', dial: '+593', emoji: '🇪🇨' },
  { name: 'El Salvador', code: 'SV', dial: '+503', emoji: '🇸🇻' },
  { name: 'Grenada', code: 'GD', dial: '+1473', emoji: '🇬🇩' },
  { name: 'Guatemala', code: 'GT', dial: '+502', emoji: '🇬🇹' },
  { name: 'Guyana', code: 'GY', dial: '+592', emoji: '🇬🇾' },
  { name: 'Haiti', code: 'HT', dial: '+509', emoji: '🇭🇹' },
  { name: 'Honduras', code: 'HN', dial: '+504', emoji: '🇭🇳' },
  { name: 'Jamaica', code: 'JM', dial: '+1876', emoji: '🇯🇲' },
  { name: 'Mexico', code: 'MX', dial: '+52', emoji: '🇲🇽' },
  { name: 'Nicaragua', code: 'NI', dial: '+505', emoji: '🇳🇮' },
  { name: 'Panama', code: 'PA', dial: '+507', emoji: '🇵🇦' },
  { name: 'Paraguay', code: 'PY', dial: '+595', emoji: '🇵🇾' },
  { name: 'Peru', code: 'PE', dial: '+51', emoji: '🇵🇪' },
  { name: 'Saint Kitts and Nevis', code: 'KN', dial: '+1869', emoji: '🇰🇳' },
  { name: 'Saint Lucia', code: 'LC', dial: '+1758', emoji: '🇱🇨' },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', dial: '+1784', emoji: '🇻🇨' },
  { name: 'Suriname', code: 'SR', dial: '+597', emoji: '🇸🇷' },
  { name: 'Trinidad and Tobago', code: 'TT', dial: '+1868', emoji: '🇹🇹' },
  { name: 'Uruguay', code: 'UY', dial: '+598', emoji: '🇺🇾' },
  { name: 'Venezuela', code: 'VE', dial: '+58', emoji: '🇻🇪' },
  // Asia
  { name: 'Afghanistan', code: 'AF', dial: '+93', emoji: '🇦🇫' },
  { name: 'Armenia', code: 'AM', dial: '+374', emoji: '🇦🇲' },
  { name: 'Azerbaijan', code: 'AZ', dial: '+994', emoji: '🇦🇿' },
  { name: 'Bahrain', code: 'BH', dial: '+973', emoji: '🇧🇭' },
  { name: 'Bangladesh', code: 'BD', dial: '+880', emoji: '🇧🇩' },
  { name: 'Bhutan', code: 'BT', dial: '+975', emoji: '🇧🇹' },
  { name: 'Brunei', code: 'BN', dial: '+673', emoji: '🇧🇳' },
  { name: 'Cambodia', code: 'KH', dial: '+855', emoji: '🇰🇭' },
  { name: 'China', code: 'CN', dial: '+86', emoji: '🇨🇳' },
  { name: 'Cyprus', code: 'CY', dial: '+357', emoji: '🇨🇾' },
  { name: 'Georgia', code: 'GE', dial: '+995', emoji: '🇬🇪' },
  { name: 'Hong Kong', code: 'HK', dial: '+852', emoji: '🇭🇰' },
  { name: 'Indonesia', code: 'ID', dial: '+62', emoji: '🇮🇩' },
  { name: 'Iran', code: 'IR', dial: '+98', emoji: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', dial: '+964', emoji: '🇮🇶' },
  { name: 'Israel', code: 'IL', dial: '+972', emoji: '🇮🇱' },
  { name: 'Japan', code: 'JP', dial: '+81', emoji: '🇯🇵' },
  { name: 'Jordan', code: 'JO', dial: '+962', emoji: '🇯🇴' },
  { name: 'Kazakhstan', code: 'KZ', dial: '+77', emoji: '🇰🇿' },
  { name: 'Kuwait', code: 'KW', dial: '+965', emoji: '🇰🇼' },
  { name: 'Kyrgyzstan', code: 'KG', dial: '+996', emoji: '🇰🇬' },
  { name: 'Laos', code: 'LA', dial: '+856', emoji: '🇱🇦' },
  { name: 'Lebanon', code: 'LB', dial: '+961', emoji: '🇱🇧' },
  { name: 'Macau', code: 'MO', dial: '+853', emoji: '🇲🇴' },
  { name: 'Malaysia', code: 'MY', dial: '+60', emoji: '🇲🇾' },
  { name: 'Mongolia', code: 'MN', dial: '+976', emoji: '🇲🇳' },
  { name: 'Myanmar', code: 'MM', dial: '+95', emoji: '🇲🇲' },
  { name: 'Nepal', code: 'NP', dial: '+977', emoji: '🇳🇵' },
  { name: 'North Korea', code: 'KP', dial: '+850', emoji: '🇰🇵' },
  { name: 'Oman', code: 'OM', dial: '+968', emoji: '🇴🇲' },
  { name: 'Pakistan', code: 'PK', dial: '+92', emoji: '🇵🇰' },
  { name: 'Palestine', code: 'PS', dial: '+970', emoji: '🇵🇸' },
  { name: 'Philippines', code: 'PH', dial: '+63', emoji: '🇵🇭' },
  { name: 'Qatar', code: 'QA', dial: '+974', emoji: '🇶🇦' },
  { name: 'Russia', code: 'RU', dial: '+7', emoji: '🇷🇺' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', emoji: '🇸🇦' },
  { name: 'Singapore', code: 'SG', dial: '+65', emoji: '🇸🇬' },
  { name: 'South Korea', code: 'KR', dial: '+82', emoji: '🇰🇷' },
  { name: 'Syria', code: 'SY', dial: '+963', emoji: '🇸🇾' },
  { name: 'Taiwan', code: 'TW', dial: '+886', emoji: '🇹🇼' },
  { name: 'Tajikistan', code: 'TJ', dial: '+992', emoji: '🇹🇯' },
  { name: 'Thailand', code: 'TH', dial: '+66', emoji: '🇹🇭' },
  { name: 'Timor-Leste', code: 'TL', dial: '+670', emoji: '🇹🇱' },
  { name: 'Turkey', code: 'TR', dial: '+90', emoji: '🇹🇷' },
  { name: 'Turkmenistan', code: 'TM', dial: '+993', emoji: '🇹🇲' },
  { name: 'Uzbekistan', code: 'UZ', dial: '+998', emoji: '🇺🇿' },
  { name: 'Vietnam', code: 'VN', dial: '+84', emoji: '🇻🇳' },
  { name: 'Yemen', code: 'YE', dial: '+967', emoji: '🇾🇪' },
  // Europe
  { name: 'Albania', code: 'AL', dial: '+355', emoji: '🇦🇱' },
  { name: 'Andorra', code: 'AD', dial: '+376', emoji: '🇦🇩' },
  { name: 'Austria', code: 'AT', dial: '+43', emoji: '🇦🇹' },
  { name: 'Belarus', code: 'BY', dial: '+375', emoji: '🇧🇾' },
  { name: 'Belgium', code: 'BE', dial: '+32', emoji: '🇧🇪' },
  { name: 'Bosnia and Herzegovina', code: 'BA', dial: '+387', emoji: '🇧🇦' },
  { name: 'Bulgaria', code: 'BG', dial: '+359', emoji: '🇧🇬' },
  { name: 'Croatia', code: 'HR', dial: '+385', emoji: '🇭🇷' },
  { name: 'Czech Republic', code: 'CZ', dial: '+420', emoji: '🇨🇿' },
  { name: 'Denmark', code: 'DK', dial: '+45', emoji: '🇩🇰' },
  { name: 'Estonia', code: 'EE', dial: '+372', emoji: '🇪🇪' },
  { name: 'Finland', code: 'FI', dial: '+358', emoji: '🇫🇮' },
  { name: 'France', code: 'FR', dial: '+33', emoji: '🇫🇷' },
  { name: 'Germany', code: 'DE', dial: '+49', emoji: '🇩🇪' },
  { name: 'Greece', code: 'GR', dial: '+30', emoji: '🇬🇷' },
  { name: 'Hungary', code: 'HU', dial: '+36', emoji: '🇭🇺' },
  { name: 'Iceland', code: 'IS', dial: '+354', emoji: '🇮🇸' },
  { name: 'Ireland', code: 'IE', dial: '+353', emoji: '🇮🇪' },
  { name: 'Italy', code: 'IT', dial: '+39', emoji: '🇮🇹' },
  { name: 'Kosovo', code: 'XK', dial: '+383', emoji: '🇽🇰' },
  { name: 'Latvia', code: 'LV', dial: '+371', emoji: '🇱🇻' },
  { name: 'Liechtenstein', code: 'LI', dial: '+423', emoji: '🇱🇮' },
  { name: 'Lithuania', code: 'LT', dial: '+370', emoji: '🇱🇹' },
  { name: 'Luxembourg', code: 'LU', dial: '+352', emoji: '🇱🇺' },
  { name: 'Malta', code: 'MT', dial: '+356', emoji: '🇲🇹' },
  { name: 'Moldova', code: 'MD', dial: '+373', emoji: '🇲🇩' },
  { name: 'Monaco', code: 'MC', dial: '+377', emoji: '🇲🇨' },
  { name: 'Montenegro', code: 'ME', dial: '+382', emoji: '🇲🇪' },
  { name: 'Netherlands', code: 'NL', dial: '+31', emoji: '🇳🇱' },
  { name: 'North Macedonia', code: 'MK', dial: '+389', emoji: '🇲🇰' },
  { name: 'Norway', code: 'NO', dial: '+47', emoji: '🇳🇴' },
  { name: 'Poland', code: 'PL', dial: '+48', emoji: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dial: '+351', emoji: '🇵🇹' },
  { name: 'Romania', code: 'RO', dial: '+40', emoji: '🇷🇴' },
  { name: 'San Marino', code: 'SM', dial: '+378', emoji: '🇸🇲' },
  { name: 'Serbia', code: 'RS', dial: '+381', emoji: '🇷🇸' },
  { name: 'Slovakia', code: 'SK', dial: '+421', emoji: '🇸🇰' },
  { name: 'Slovenia', code: 'SI', dial: '+386', emoji: '🇸🇮' },
  { name: 'Spain', code: 'ES', dial: '+34', emoji: '🇪🇸' },
  { name: 'Sweden', code: 'SE', dial: '+46', emoji: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dial: '+41', emoji: '🇨🇭' },
  { name: 'Ukraine', code: 'UA', dial: '+380', emoji: '🇺🇦' },
  // Oceania
  { name: 'Fiji', code: 'FJ', dial: '+679', emoji: '🇫🇯' },
  { name: 'Kiribati', code: 'KI', dial: '+686', emoji: '🇰🇮' },
  { name: 'Marshall Islands', code: 'MH', dial: '+692', emoji: '🇲🇭' },
  { name: 'Micronesia', code: 'FM', dial: '+691', emoji: '🇫🇲' },
  { name: 'Nauru', code: 'NR', dial: '+674', emoji: '🇳🇷' },
  { name: 'New Zealand', code: 'NZ', dial: '+64', emoji: '🇳🇿' },
  { name: 'Palau', code: 'PW', dial: '+680', emoji: '🇵🇼' },
  { name: 'Papua New Guinea', code: 'PG', dial: '+675', emoji: '🇵🇬' },
  { name: 'Samoa', code: 'WS', dial: '+685', emoji: '🇼🇸' },
  { name: 'Solomon Islands', code: 'SB', dial: '+677', emoji: '🇸🇧' },
  { name: 'Tonga', code: 'TO', dial: '+676', emoji: '🇹🇴' },
  { name: 'Tuvalu', code: 'TV', dial: '+688', emoji: '🇹🇻' },
  { name: 'Vanuatu', code: 'VU', dial: '+678', emoji: '🇻🇺' },
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
