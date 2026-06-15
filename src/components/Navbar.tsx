import React, { useState, useEffect, useRef } from 'react';
import { X, Menu, User as UserIcon, LogOut, Briefcase, Shield, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { UserAuth } from './UserAuth';
import { User } from '@supabase/supabase-js';
import { dbService } from '../services/db';

interface NavbarProps {
  activeTab: 'home' | 'accommodation' | 'weddings-events' | 'about' | 'contact' | 'my-bookings' | 'staff';
  onTabChange: (tab: 'home' | 'accommodation' | 'weddings-events' | 'about' | 'contact' | 'my-bookings' | 'staff') => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const Navbar = ({ activeTab, onTabChange, cartCount, onOpenCart }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Publish the fixed header's real height as a CSS variable so the Hero (and
  // any other full-bleed section) can offset itself and never sit underneath it.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setVar);
    };
  }, []);

  const checkAdminStatus = async (uid: string) => {
    try {
      const profile = await dbService.getAdminProfile(uid);
      setIsAdminUser(!!profile);
    } catch {
      setIsAdminUser(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdminStatus(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdminUser(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavClick = (tab: any) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookNow = () => {
    setIsMobileMenuOpen(false);
    if (activeTab === 'home') {
      document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      onTabChange('home');
      // Wait for home tab to render before scrolling to the filter section
      setTimeout(() => {
        document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' });
      }, 350);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsProfileOpen(false);
      handleNavClick('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'accommodation', label: 'Accommodation' },
    { id: 'weddings-events', label: 'Weddings & Events' },
    { id: 'about', label: 'About Us' },
    { id: 'contact', label: 'Contact Us' },
  ];

  return (
    <>
      {/* Hidden cart trigger */}
      <button
        onClick={onOpenCart}
        aria-label={`Open booking cart${cartCount > 0 ? `, ${cartCount} item${cartCount > 1 ? 's' : ''}` : ''}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-20 focus:right-4 focus:z-[60] focus:bg-natural-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-full focus:text-xs focus:font-bold"
      >
        Cart {cartCount > 0 ? `(${cartCount})` : ''}
      </button>

      {/* Fixed wrapper: announcement bar + nav */}
      <div ref={wrapperRef} className="fixed top-0 left-0 right-0 z-50">
        {/* Blue announcement bar */}
        <div className="bg-natural-primary text-white py-2 px-4 text-center text-[11px] font-semibold tracking-wide flex items-center justify-center gap-2">
          <Phone className="w-3 h-3 shrink-0" />
          For any inquiries contact us: +1 (800) 123-4567
        </div>

        {/* White navigation bar */}
        <nav className="relative bg-white border-b border-natural-accent shadow-sm py-3 md:py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex justify-between items-center">
            {/* Logo */}
            <div className="cursor-pointer group shrink-0" onClick={() => handleNavClick('home')}>
              <img
                src="/amadiya-logo.png"
                alt="Amadiya Port Arthur Villas"
                className="h-10 md:h-12 w-auto object-contain transition-opacity group-hover:opacity-75"
              />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-6 xl:space-x-9 text-[11px] lg:text-[13px] font-bold uppercase tracking-[0.15em] lg:tracking-[0.22em] text-natural-dark">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id as any)}
                  className={`border-b-2 transition-all pb-1 whitespace-nowrap ${
                    activeTab === link.id
                      ? 'border-natural-primary text-natural-primary'
                      : 'border-transparent text-natural-dark hover:text-natural-primary hover:border-natural-primary/50'
                  }`}
                >
                  {link.label}
                </button>
              ))}

              <div className="h-4 w-[1px] bg-natural-accent" />

              {/* Person icon — auth modal when logged out, profile dropdown when logged in */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="w-9 h-9 rounded-full bg-natural-primary/10 flex items-center justify-center hover:bg-natural-primary/20 transition-all"
                    aria-label="Account menu"
                  >
                    <UserIcon className="w-4 h-4 text-natural-primary" />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-4 w-52 bg-white rounded-2xl shadow-xl border border-natural-accent p-2 overflow-hidden"
                      >
                        {isAdminUser ? (
                          <button
                            onClick={() => { handleNavClick('staff'); setIsProfileOpen(false); }}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-natural-cream text-natural-dark transition-all text-left"
                          >
                            <Shield className="w-4 h-4 text-natural-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Management</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => { handleNavClick('my-bookings'); setIsProfileOpen(false); }}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-natural-cream text-natural-dark transition-all text-left"
                          >
                            <Briefcase className="w-4 h-4 text-natural-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">My Bookings</span>
                          </button>
                        )}

                        <div className="h-[1px] bg-natural-accent my-1 mx-2" />

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 transition-all text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="w-9 h-9 rounded-full border-2 border-natural-accent flex items-center justify-center text-natural-dark hover:border-natural-primary hover:text-natural-primary hover:bg-natural-cream transition-all"
                  aria-label="Sign in"
                >
                  <UserIcon className="w-4 h-4" />
                </button>
              )}

              {/* Book Now — always visible */}
              <button
                onClick={handleBookNow}
                className="bg-natural-primary text-white px-8 py-3 rounded-full font-bold text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
              >
                Book Now
              </button>
            </div>

            {/* Mobile: person icon + hamburger */}
            <div className="flex md:hidden items-center gap-2">
              {!user && (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="p-2 rounded-full border border-natural-accent hover:border-natural-primary hover:text-natural-primary transition-colors text-natural-dark"
                  aria-label="Sign in"
                >
                  <UserIcon className="w-4 h-4" />
                </button>
              )}
              <button className="p-2 rounded-full hover:bg-natural-cream transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="text-natural-dark" /> : <Menu className="text-natural-dark" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white w-full overflow-hidden absolute top-full left-0 border-t border-natural-accent shadow-2xl"
              >
                <div className="flex flex-col p-10 space-y-8 text-xs font-bold uppercase tracking-[0.2em] text-natural-dark">
                  {navLinks.map(link => (
                    <button
                      key={link.id}
                      onClick={() => handleNavClick(link.id as any)}
                      className={`text-left font-serif text-3xl italic normal-case tracking-normal transition-colors ${activeTab === link.id ? 'text-natural-primary' : 'text-natural-dark'}`}
                    >
                      {link.label}
                    </button>
                  ))}
                  {user && (
                    <>
                      {isAdminUser ? (
                        <button onClick={() => handleNavClick('staff')} className="text-left font-serif text-3xl italic normal-case tracking-normal">
                          Management
                        </button>
                      ) : (
                        <button onClick={() => handleNavClick('my-bookings')} className="text-left font-serif text-3xl italic normal-case tracking-normal">
                          My Bookings
                        </button>
                      )}
                      <button onClick={handleLogout} className="text-left text-red-500 pt-4 border-t border-natural-accent">
                        Sign Out
                      </button>
                    </>
                  )}
                  {/* Book Now always visible in mobile menu */}
                  <button
                    onClick={handleBookNow}
                    className="bg-natural-primary text-white py-5 rounded-2xl text-center font-bold uppercase tracking-widest text-[11px]"
                  >
                    Book Now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>

      <AnimatePresence>
        {isAuthOpen && (
          <UserAuth
            onClose={() => setIsAuthOpen(false)}
            onStaffLogin={() => {
              setIsAuthOpen(false);
              onTabChange('staff');
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
