import React, { useState, useEffect, useRef } from 'react';
import { X, Menu, User as UserIcon, LogOut, Briefcase, Shield, Phone, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, type User } from '../lib/auth';
import { UserAuth } from './UserAuth';
import { dbService } from '../services/db';
import { useTenant, BRAND_DEFAULTS } from '../contexts/TenantContext';
import type { TabId } from '../types';

interface NavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  cartCount: number;
  onOpenCart: () => void;
}

// Top-level nav. "Explore" is a parent with a hover dropdown; everything else is
// a direct tab. Keep this in sync with the AnimatePresence switch in App.tsx.
type NavItem =
  | { id: TabId; label: string }
  | { id: 'explore'; label: string; children: { id: TabId; label: string }[] };

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'experiences', label: 'Experiences' },
  {
    id: 'explore',
    label: 'Explore',
    children: [
      { id: 'gallery', label: 'Gallery' },
      { id: 'explore-locations', label: 'Explore Locations' },
    ],
  },
  { id: 'about', label: 'About Us' },
  { id: 'contact', label: 'Contact Us' },
];

const EXPLORE_TABS: TabId[] = ['gallery', 'explore-locations'];

export const Navbar = ({ activeTab, onTabChange, cartCount, onOpenCart }: NavbarProps) => {
  const tenant = useTenant();
  const logoUrl = tenant.logoUrl || BRAND_DEFAULTS.logoUrl;
  const markLogoUrl = tenant.markLogoUrl || BRAND_DEFAULTS.markLogoUrl;
  const brandName = tenant.name || BRAND_DEFAULTS.name;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
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
    auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdminStatus(session.user.id);
    });

    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
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
      await auth.signOut();
      setIsProfileOpen(false);
      handleNavClick('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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

        {/* White navigation bar — enlarged ~30%; --nav-h is re-measured by the
            ResizeObserver below so the Hero offset tracks the taller header. */}
        <nav className="relative bg-white border-b border-natural-accent shadow-sm py-4 md:py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex items-center">
            {/* Logo lockup: blue "A" mark + wordmark */}
            <div className="cursor-pointer group shrink-0 flex items-center gap-2.5 md:gap-3" onClick={() => handleNavClick('home')}>
              <img
                src={markLogoUrl}
                alt=""
                aria-hidden="true"
                className="h-[52px] md:h-16 w-auto object-contain transition-opacity group-hover:opacity-75"
              />
              <img
                src={logoUrl}
                alt={brandName}
                className="h-[52px] md:h-16 w-auto object-contain transition-opacity group-hover:opacity-75"
              />
            </div>

            {/* Desktop nav links — grouped with the logo at the same gap as the
                inter-item spacing (ml-* mirrors space-x-*) so logo→Home reads
                identically to Home→Accommodation. */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-6 xl:space-x-8 ml-3 lg:ml-6 xl:ml-8 text-[11px] lg:text-[13px] font-bold uppercase tracking-[0.15em] lg:tracking-[0.22em] text-natural-dark">
              {NAV_ITEMS.map(item => (
                'children' in item ? (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setIsExploreOpen(true)}
                    onMouseLeave={() => setIsExploreOpen(false)}
                  >
                    <button
                      onClick={() => setIsExploreOpen(o => !o)}
                      className={`flex items-center gap-1.5 border-b-2 transition-all pb-1 whitespace-nowrap ${
                        EXPLORE_TABS.includes(activeTab)
                          ? 'border-natural-primary text-natural-primary'
                          : 'border-transparent text-natural-dark hover:text-natural-primary hover:border-natural-primary/50'
                      }`}
                      aria-haspopup="true"
                      aria-expanded={isExploreOpen}
                    >
                      {item.label}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExploreOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isExploreOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          /* top-full + pt-3 keeps the gap hoverable so the menu
                             doesn't flicker shut when the cursor crosses it. */
                          className="absolute left-0 top-full pt-3 w-56 z-50"
                        >
                          <div className="bg-white rounded-2xl shadow-xl border border-natural-accent p-2 overflow-hidden">
                            {item.children.map(child => (
                              <button
                                key={child.id}
                                onClick={() => { handleNavClick(child.id); setIsExploreOpen(false); }}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-[11px] font-bold uppercase tracking-widest ${
                                  activeTab === child.id
                                    ? 'bg-natural-cream text-natural-primary'
                                    : 'text-natural-dark hover:bg-natural-cream hover:text-natural-primary'
                                }`}
                              >
                                {child.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`border-b-2 transition-all pb-1 whitespace-nowrap ${
                      activeTab === item.id
                        ? 'border-natural-primary text-natural-primary'
                        : 'border-transparent text-natural-dark hover:text-natural-primary hover:border-natural-primary/50'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              ))}
            </div>

            {/* Desktop actions — pinned to the far right, independent of the
                logo↔nav grouping on the left. */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-6 xl:space-x-8 ml-auto text-[11px] lg:text-[13px] font-bold uppercase tracking-[0.15em] lg:tracking-[0.22em] text-natural-dark">
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
            <div className="flex md:hidden items-center gap-2 ml-auto">
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
                  {NAV_ITEMS.map(item => (
                    'children' in item ? (
                      <div key={item.id} className="space-y-5">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-natural-muted">{item.label}</span>
                        {item.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => handleNavClick(child.id)}
                            className={`block text-left font-serif text-3xl italic normal-case tracking-normal transition-colors ${activeTab === child.id ? 'text-natural-primary' : 'text-natural-dark'}`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`text-left font-serif text-3xl italic normal-case tracking-normal transition-colors ${activeTab === item.id ? 'text-natural-primary' : 'text-natural-dark'}`}
                      >
                        {item.label}
                      </button>
                    )
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
