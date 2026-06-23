import React from 'react';
import { useTenant, BRAND_DEFAULTS } from '../contexts/TenantContext';

type TabId = 'home' | 'accommodation' | 'weddings-events' | 'about' | 'contact' | 'my-bookings' | 'staff';

interface FooterProps {
  onTabChange: (tab: TabId) => void;
}

const navLinks: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'about', label: 'About Us' },
  { id: 'contact', label: 'Contact Us' },
];

export const Footer = ({ onTabChange }: FooterProps) => {
  const tenant = useTenant();
  const logoUrl = tenant.logoUrl || BRAND_DEFAULTS.logoUrl;
  const brandName = tenant.name || BRAND_DEFAULTS.name;

  const handleClick = (tab: TabId) => {
    onTabChange(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-white border-t border-natural-accent py-6 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="shrink-0">
          <img
            src={logoUrl}
            alt={brandName}
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Nav links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest">
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => handleClick(link.id)}
              className="text-natural-muted hover:text-natural-primary transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-[10px] text-natural-muted font-medium shrink-0">
          © {new Date().getFullYear()} {brandName}
        </p>
      </div>
    </footer>
  );
};
