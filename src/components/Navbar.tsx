import React, { useState, useEffect } from 'react';
import { Search, X, Menu, User as UserIcon, LogOut, Briefcase, Shield, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { UserAuth } from './UserAuth';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  activeTab: 'home' | 'accommodation' | 'weddings-events' | 'about' | 'contact' | 'my-bookings' | 'staff';
  onTabChange: (tab: 'home' | 'accommodation' | 'weddings-events' | 'about' | 'contact' | 'my-bookings' | 'staff') => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const Navbar = ({ activeTab, onTabChange, cartCount, onOpenCart }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const handleNavClick = (tab: any) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
    // Scroll to top when changing views
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-natural-cream/80 backdrop-blur-md shadow-sm py-3 md:py-4' : 'bg-transparent py-4 md:py-6 lg:py-8'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={() => handleNavClick('home')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-natural-primary rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
              <Search className="w-4 h-4 sm:w-5 h-5 text-white" />
            </div>
            <div className={`font-serif text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight transition-colors duration-500 text-natural-dark whitespace-nowrap`}>
              Amadiya Leisure
            </div>
          </div>

          {/* Desktop Menu */}
          <div className={`hidden md:flex items-center space-x-3 lg:space-x-7 xl:space-x-10 text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em] transition-colors duration-500 text-natural-dark`}>
            {navLinks.map(link => (
              <button 
                key={link.id}
                onClick={() => handleNavClick(link.id as any)}
                className={`border-b-2 transition-all pb-1 whitespace-nowrap ${activeTab === link.id ? 'border-natural-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                {link.label}
              </button>
            ))}
            
            <div className="h-4 w-[1px] bg-natural-accent" />

            {/* Cart Button */}
            <button 
              onClick={onOpenCart} 
              className="relative p-2.5 bg-white border border-natural-accent rounded-full text-natural-dark hover:bg-natural-bg/50 hover:text-natural-primary transition-all shadow-sm flex items-center justify-center mr-2"
              aria-label="Open your booking cart"
            >
              <ShoppingCart className="w-4 h-4 text-natural-dark hover:text-natural-primary" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-natural-primary text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-3 group"
                >
                  <div className="w-8 h-8 rounded-full bg-natural-primary/10 flex items-center justify-center group-hover:bg-natural-primary/20 transition-all">
                    <UserIcon className="w-4 h-4 text-natural-primary" />
                  </div>
                  <span className="opacity-60 group-hover:opacity-100 transition-all truncate max-w-[100px]">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'}
                  </span>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-4 w-56 bg-natural-cream rounded-2xl shadow-xl border border-natural-accent p-2 overflow-hidden"
                    >
                      <button 
                        onClick={() => { handleNavClick('my-bookings'); setIsProfileOpen(false); }}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-natural-bg text-natural-dark transition-all text-left"
                      >
                        <Briefcase className="w-4 h-4 text-natural-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">My Bookings</span>
                      </button>
                      
                      <button 
                        onClick={() => { handleNavClick('staff'); setIsProfileOpen(false); }}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-natural-bg text-natural-dark transition-all text-left"
                      >
                        <Shield className="w-4 h-4 text-natural-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Management</span>
                      </button>

                      <div className="h-[1px] bg-natural-bg my-1 mx-2" />

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
                className="bg-natural-primary text-white px-8 py-3 rounded-full font-bold text-[9px] uppercase tracking-widest hover:bg-natural-dark transition-all shadow-lg active:scale-95"
              >
                Join / Sign In
              </button>
            )}
          </div>

          {/* Mobile Cart & Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={onOpenCart} 
              className="relative p-2 bg-white border border-natural-accent rounded-full text-natural-dark hover:bg-natural-bg/50 transition-all shadow-sm flex items-center justify-center"
              aria-label="Open mobile cart"
            >
              <ShoppingCart className="w-4 h-4 text-natural-dark" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-natural-primary text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
            <button className="p-2 rounded-full hover:bg-black/5" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
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
              className="md:hidden bg-natural-cream w-full overflow-hidden absolute top-full left-0 border-t border-natural-accent shadow-2xl"
            >
              <div className="flex flex-col p-10 space-y-8 text-xs font-bold uppercase tracking-[0.2em] text-natural-dark">
                {navLinks.map(link => (
                  <button key={link.id} onClick={() => handleNavClick(link.id as any)} className="text-left font-serif text-3xl italic normal-case tracking-normal">
                    {link.label}
                  </button>
                ))}
                {user && (
                  <>
                    <button onClick={() => handleNavClick('my-bookings')} className="text-left font-serif text-3xl italic normal-case tracking-normal">
                      My Bookings
                    </button>
                    <button onClick={() => handleNavClick('staff')} className="text-left font-serif text-3xl italic normal-case tracking-normal">
                      Staff Portal
                    </button>
                    <button onClick={handleLogout} className="text-left text-red-500 pt-4 border-t border-natural-bg">
                      Sign Out
                    </button>
                  </>
                )}
                {!user && (
                  <button onClick={() => { setIsAuthOpen(true); setIsMobileMenuOpen(false); }} className="bg-natural-primary text-white py-5 rounded-2xl text-center">
                    Join Amadiya Leisure
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

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
