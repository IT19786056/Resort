\import React, { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, ChevronRight, ArrowLeft, Search, Trash2, ShoppingCart, ShieldCheck, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { dbService } from './services/db';

// Hooks
import { useAccommodations } from './hooks/useAccommodations';

// Components
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FilterBar } from './components/FilterBar';
import { Footer } from './components/Footer';
import { BookingForm } from './components/BookingForm';
import { MyBookings } from './components/MyBookings';
import { AboutUs } from './components/AboutUs';
import { ContactUs } from './components/ContactUs';
import { WeddingsEvents } from './components/WeddingsEvents';
import { LoadingPlane } from './components/ui/LoadingPlane';
import { SkeletonCard } from './components/ui/SkeletonCard';
import { Gallery } from './components/ui/Gallery';
import { UserAuth } from './components/UserAuth';
import { CartDrawer } from './components/CartDrawer';

// Lazy load Admin to minimize initial bundle size and make site feel lighter
const Admin = lazy(() => import('./components/Admin').then(m => ({ default: m.Admin })));

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'accommodation' | 'weddings-events' | 'about' | 'contact' | 'my-bookings' | 'staff'>(() => {
    const path = window.location.pathname;
    if (path === '/admin' || path.startsWith('/admin/')) {
      return 'staff';
    }
    return 'home';
  });
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Cart and user auth states
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('amadiya_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartAuthOpen, setIsCartAuthOpen] = useState(false);
  const [showCartSuccess, setShowCartSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Guest booking and dynamic OTP registration memory state
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'booking-signup'>('login');

  useEffect(() => {
    localStorage.setItem('amadiya_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAddToCart = (item: any) => {
    // Prevent duplicate accommodations with same dates
    const exists = cart.some(
      i => i.accommodation.id === item.accommodation.id &&
           i.checkIn === item.checkIn &&
           i.checkOut === item.checkOut
    );
    if (exists) {
      alert('This sanctuary is already in your cart for the selected dates!');
      return;
    }

    if (user) {
      // Normal flow if user is logged in: Add to cart and slide out the Cart Panel
      setCart(prev => [...prev, { ...item, id: Math.random().toString(36).substring(2, 11) }]);
      setSelectedItem(null);
      setIsBooking(false);
      setIsCartOpen(true);
    } else {
      // Guest flow: Capture input, lock on booking-signup OTP modal, and open it
      setPendingBooking(item);
      setAuthEmail(item.email || '');
      setAuthName(item.fullName || '');
      setAuthPhone(item.phone || '');
      setAuthMode('booking-signup');
      setIsCartAuthOpen(true);
    }
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Sync activeTab with window URL history
  useEffect(() => {
    const path = window.location.pathname;
    if (activeTab === 'staff') {
      if (path !== '/admin') {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (path === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [activeTab]);

  // Handle back and forward button navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin' || path.startsWith('/admin/')) {
        setActiveTab('staff');
      } else {
        if (activeTab === 'staff') {
          setActiveTab('home');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  const { 
    hotels, 
    loading, 
    refreshing,
    error,
    filters, 
    filteredItems, 
    setFilters,
    refresh
  } = useAccommodations();

  const [isSearched, setIsSearched] = useState(false);

  // Database and Supabase status state for debugging
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 800) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/db-status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(() => {});
  }, []);


  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsBooking(false);
    setBookingSuccess(false);
  };

  const handleStartBooking = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsBooking(true);
  };

  const handleTabChange = (tab: any) => {
    if (tab === 'staff') {
      setActiveTab('staff');
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (activeTab === 'staff') {
    return (
      <Suspense fallback={<LoadingPlane label="Entering Management Control" />}>
        <div className="relative">
          <button 
            onClick={() => setActiveTab('home')}
            className="fixed bottom-8 left-8 z-[100] bg-natural-dark text-white px-8 py-4 rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-2xl flex items-center gap-3 hover:bg-natural-primary transition-all scale-90 hover:scale-100"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sanctuary
          </button>
          <Admin />
        </div>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-natural-bg selection:bg-natural-primary/20">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loader"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <LoadingPlane label="Amadiya Leisure" />
          </motion.div>
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            <Navbar 
              activeTab={activeTab as any}
              onTabChange={handleTabChange}
              cartCount={cart.length}
              onOpenCart={() => setIsCartOpen(true)}
            />
            
            <AnimatePresence mode="wait">
              {activeTab === 'home' ? (
                <motion.div
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Hero />
                  
                  {/* Refreshing Indicator */}
                  {refreshing && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-natural-cream/80 backdrop-blur-md border border-natural-accent px-6 py-2 rounded-full shadow-lg flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-natural-primary rounded-full animate-ping" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-natural-dark">Synchronizing...</span>
                    </motion.div>
                  )}

                  {/* Database Configuration Helper Banner */}
                  {dbStatus && (dbStatus.mode === 'mock' || error) && (
                    <div className="bg-natural-primary/5 border-b border-natural-primary/10 py-4 px-10">
                      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-natural-dark">
                            {dbStatus.mode === 'mock' ? 'Running in Studio Mock Mode' : 'Database Connection Issue'}
                          </p>
                        </div>
                        <p className="text-[11px] text-natural-muted font-light italic">
                          {dbStatus.mode === 'mock' 
                            ? 'Configure DATABASE_URL in Settings -> Secrets to enable persistent storage.'
                            : `Error: ${error}`}
                        </p>
                        {dbStatus.mode === 'mock' && (
                          <button 
                            onClick={() => window.alert('Please go to Settings -> Secrets and add your Supabase DATABASE_URL.')}
                            className="text-[9px] font-bold uppercase tracking-widest text-natural-primary border-b border-natural-primary pb-1 hover:opacity-60"
                          >
                            Setup Guide
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <main id="stays" className="flex-1 scroll-mt-28 md:scroll-mt-32">
                    <FilterBar 
                      onFilterChange={(f) => {
                        setFilters(prev => ({...prev, ...f}));
                        setIsSearched(true);
                      }} 
                      onSearch={() => setIsSearched(true)}
                      currentFilter={filters} 
                      hotels={hotels} 
                    />

                    <section id="stays-list" className="max-w-7xl mx-auto px-6 py-24">
                      {!isSearched ? (
                        <>
                          <div className="mb-12 md:mb-20 text-center">
                            <motion.h2 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              className="font-serif text-fluid-h1 mb-4 md:mb-6 italic text-natural-dark tracking-tighter"
                            >
                              Our Portfolio
                            </motion.h2>
                            <p className="text-natural-muted max-w-2xl mx-auto font-light text-fluid-body italic">
                              Our resorts are more than places to stay—they are portals to different worlds, harmonizing architecture with nature.
                            </p>
                          </div>

                          <motion.div 
                            variants={{
                              hidden: { opacity: 0 },
                              show: {
                                opacity: 1,
                                transition: {
                                  staggerChildren: 0.1
                                }
                              }
                            }}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12"
                          >
                            {loading ? (
                              [1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)
                            ) : hotels.map((hotel, index) => (
                              <HotelCard 
                                key={hotel.id} 
                                hotel={hotel} 
                                index={index} 
                                onClick={() => setSelectedHotel(hotel)} 
                              />
                            ))}
                          </motion.div>
                        </>
                      ) : (
                        <>
                          <div className="mb-12 md:mb-20 text-center">
                            <motion.h2 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              className="font-serif text-fluid-h1 mb-4 md:mb-6 italic text-natural-dark tracking-tighter"
                            >
                              Our Curated Micro-Escapes.
                            </motion.h2>
                            <p className="text-natural-muted max-w-2xl mx-auto font-light text-fluid-body italic">
                              Explore our handpicked selection of stays, from overwater suites to hidden garden villas.
                            </p>
                          </div>

                          <motion.div 
                            variants={{
                              hidden: { opacity: 0 },
                              show: {
                                opacity: 1,
                                transition: {
                                  staggerChildren: 0.1
                                }
                              }
                            }}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12"
                          >
                            {loading ? (
                              [1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)
                            ) : filteredItems.map((item, index) => (
                              <AccommodationCard 
                                key={item.id} 
                                item={item} 
                                index={index} 
                                onClick={() => { setSelectedItem(item); setIsBooking(false); }}
                                onBook={(e) => handleStartBooking(e, item)}
                                disabled={!item.isAvailable}
                              />
                            ))}
                          </motion.div>

                          {filteredItems.length === 0 && (
                            <div className="py-40 text-center">
                              <p className="text-natural-muted text-xl italic font-light">No stays match your current preferences.</p>
                              <div className="flex justify-center gap-6 mt-8">
                                <button 
                                  onClick={() => {
                                    setFilters({ type: 'All', priceRange: [0, 5000], minRating: 0, location: 'All', checkIn: '', checkOut: '', hotelId: 'All' });
                                    setIsSearched(false);
                                  }}
                                  className="text-natural-primary font-bold uppercase text-[10px] tracking-[0.4em] border-b border-natural-primary pb-2 hover:opacity-70 transition-opacity"
                                >
                                  Reset All Filters
                                </button>
                                <button 
                                  onClick={() => setIsSearched(false)}
                                  className="text-natural-muted font-bold uppercase text-[10px] tracking-[0.4em] border-b border-natural-accent pb-2 hover:opacity-70 transition-opacity"
                                >
                                  View Portfolios
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  </main>
                </motion.div>
              ) : activeTab === 'accommodation' ? (
                <motion.div
                  key="accommodation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pt-40 pb-32 px-10 min-h-screen"
                >
                  <div className="max-w-7xl mx-auto">
                    <div className="mb-16 md:mb-28 text-center">
                      <h1 className="font-serif text-fluid-hero italic text-natural-dark mb-6 md:mb-10 tracking-tighter leading-none">The Portfolios.</h1>
                      <p className="text-natural-muted max-w-3xl mx-auto text-fluid-body font-light italic leading-relaxed">
                        Our resorts are more than places to stay—they are portals to different worlds, harmonizing architecture with the raw beauty of nature.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
                      {hotels.map((hotel, index) => (
                        <HotelCard 
                          key={hotel.id} 
                          hotel={hotel} 
                          index={index} 
                          onClick={() => setSelectedHotel(hotel)} 
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'weddings-events' ? (
                <motion.div
                  key="weddings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <WeddingsEvents 
                    venues={hotels.filter(h => h.hasBanquetHall)} 
                    onSelectVenue={(id) => {
                      const hotel = hotels.find(h => h.id === id);
                      if (hotel) setSelectedHotel(hotel);
                    }}
                  />
                </motion.div>
              ) : activeTab === 'about' ? (
                <motion.div
                  key="about"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <AboutUs />
                </motion.div>
              ) : activeTab === 'contact' ? (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ContactUs />
                </motion.div>
              ) : (
                <motion.div
                  key="my-bookings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="pt-32 min-h-screen"
                >
                  <MyBookings />
                </motion.div>
              )}
            </AnimatePresence>

            <Footer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {selectedHotel && (
          <HotelDetailModal 
            hotel={selectedHotel} 
            onClose={() => setSelectedHotel(null)} 
            onViewStays={() => {
              setSelectedHotel(null);
              setFilters(prev => ({ ...prev, location: selectedHotel.location, hotelId: selectedHotel.id }));
              setIsSearched(true);
              setActiveTab('home');
              setTimeout(() => {
                const section = document.getElementById('stays-list');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
              }, 200);
            }}
          />
        )}
        {selectedItem && (
          <AccommodationDetailModal 
            item={selectedItem} 
            isBooking={isBooking}
            bookingSuccess={bookingSuccess}
            onClose={handleCloseModal}
            onStartBooking={() => setIsBooking(true)}
            onAddToCart={handleAddToCart}
            initialCheckIn={filters.checkIn}
            initialCheckOut={filters.checkOut}
          />
        )}
      </AnimatePresence>

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={() => setCart([])}
        user={user}
        onOpenAuth={() => setIsCartAuthOpen(true)}
        onSuccess={() => {
          setIsCartOpen(false);
          setShowCartSuccess(true);
          refresh();
        }}
      />

      <AnimatePresence>
        {isCartAuthOpen && (
          <UserAuth 
            onClose={() => {
              setIsCartAuthOpen(false);
              setPendingBooking(null);
              setAuthMode('login');
              setAuthEmail('');
              setAuthName('');
              setAuthPhone('');
            }}
            onSuccess={() => {
              setIsCartAuthOpen(false);
            }}
            initialEmail={authEmail}
            initialDisplayName={authName}
            initialPhone={authPhone}
            isModalMode={authMode}
            onVerifySuccess={async (credentials) => {
              if (pendingBooking) {
                // Add the booking to the cart rather than placing it automatically
                setCart(prev => [...prev, { ...pendingBooking, id: Math.random().toString(36).substring(2, 11) }]);
                
                // Reset all states and modals
                setSelectedItem(null);
                setIsBooking(false);
                setPendingBooking(null);
                setAuthMode('login');
                setAuthEmail('');
                setAuthName('');
                setAuthPhone('');
                setIsCartAuthOpen(false);
                
                // Slide open the sanctuary cart drawer allowing review and final booking checkout
                setIsCartOpen(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCartSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCartSuccess(false)}
              className="fixed inset-0 bg-natural-dark backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-md bg-natural-cream rounded-[32px] p-8 md:p-12 text-center shadow-2xl border border-natural-accent flex flex-col items-center"
            >
              <button 
                onClick={() => setShowCartSuccess(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-natural-accent/20 transition-all border border-natural-accent bg-white cursor-pointer"
              >
                <X className="w-5 h-5 text-natural-dark" />
              </button>

              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center border border-green-200 mb-6 animate-bounce">
                <ShieldCheck className="w-10 h-10 text-green-600" />
              </div>

              <h4 className="font-serif text-3xl italic text-natural-dark mb-4">Escape Requested.</h4>
              <p className="text-sm text-natural-muted font-light italic leading-relaxed max-w-sm mb-8 select-none">
                Your bespoke travels have been registered. Our concierge service will reach out to verify and process your booking.
              </p>

              <button
                onClick={() => setShowCartSuccess(false)}
                className="w-full bg-natural-primary text-white py-4 rounded-full font-bold uppercase tracking-[0.2em] shadow-lg hover:bg-natural-dark transition-all text-[10px] cursor-pointer"
              >
                Acknowledge
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === 'home' && showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            onClick={() => {
              const staysSec = document.getElementById('stays');
              if (staysSec) staysSec.scrollIntoView({ behavior: 'smooth' });
            }}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[60] bg-natural-dark text-white px-6 py-4 rounded-full font-bold uppercase text-[9px] tracking-[0.3em] shadow-2xl flex items-center gap-3 hover:bg-natural-primary transition-all group"
          >
            <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Modify Search
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components (Kept here as they are specific to App's view) ---

const AccommodationCard = ({ item, index, onClick, onBook, disabled }: any) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: index * 0.1 }}
    onClick={disabled ? undefined : onClick}
    className={`bg-natural-cream rounded-[24px] overflow-hidden flex flex-col shadow-md border border-natural-accent group hover:shadow-2xl transition-all duration-500 cursor-pointer ${disabled ? 'opacity-70 grayscale-[0.5]' : ''}`}
  >
    <div className="w-full aspect-[16/10] bg-natural-accent overflow-hidden relative">
      <img 
        src={item.imageUrl} 
        alt={item.name} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-4 md:top-6 right-4 md:right-6 bg-white/90 backdrop-blur-md px-3 md:px-4 py-1 md:py-1.5 rounded-full text-fluid-eyebrow font-bold uppercase tracking-[0.2em] text-natural-primary border border-natural-accent">
        {item.type}
      </div>
      {disabled && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <span className="bg-white text-natural-dark px-4 py-1.5 rounded-full font-bold uppercase text-[9px] tracking-widest shadow-xl">Already Booked</span>
        </div>
      )}
    </div>
    <div className="p-8 flex flex-col flex-1">
      <div className="flex justify-between items-start mb-4 md:mb-6">
        <h3 className="font-serif text-fluid-card-title text-natural-dark italic group-hover:text-natural-primary transition-colors">{item.name}</h3>
        <span className="flex items-center text-[10px] md:text-xs font-bold text-natural-primary bg-natural-primary/5 px-2 md:px-3 py-1 rounded-full">
          <Star className="w-3 h-3 mr-1 md:mr-1.5 fill-current" /> {item.rating}
        </span>
      </div>
      <p className="text-fluid-body text-natural-muted leading-relaxed mb-6 md:mb-8 flex-1 italic font-light">
        {item.description}
      </p>
      <div className="mt-auto flex items-center justify-between pt-8 border-t border-natural-bg">
        <div className="flex items-baseline">
          <span className="text-2xl md:text-3xl font-bold text-natural-dark">${item.price}</span>
          <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.2em] text-natural-muted ml-2 md:ml-3">/ night</span>
        </div>
        {!disabled && (
          <button 
            onClick={onBook}
            className="bg-natural-primary text-white p-3 md:p-4 rounded-full hover:bg-natural-dark transition-all shadow-lg active:scale-95"
          >
            <ChevronRight className="w-4 md:w-5 h-4 md:h-5" />
          </button>
        )}
      </div>
    </div>
  </motion.div>
);

const HotelCard = ({ hotel, index, onClick }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.8 }}
    onClick={onClick}
    className="group bg-white rounded-[24px] overflow-hidden flex flex-col shadow-md border border-natural-accent hover:shadow-2xl transition-all duration-500 cursor-pointer"
  >
    <div className="w-full aspect-[16/10] bg-natural-accent overflow-hidden relative">
      <img 
        src={hotel.imageUrl} 
        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[2000ms]" 
        alt={hotel.name}
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-natural-dark/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex items-end p-8">
        <p className="text-white text-fluid-body font-light italic max-w-sm">
          {hotel.description}
        </p>
      </div>
    </div>
    <div className="p-8 flex-1 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-3 md:w-4 h-3 md:h-4 text-natural-primary" />
        <span className="text-fluid-eyebrow font-bold uppercase tracking-[0.4em] text-natural-muted">{hotel.location}</span>
      </div>
      <h3 className="font-serif text-fluid-card-title text-natural-dark group-hover:italic transition-all duration-500 tracking-tighter">{hotel.name}</h3>
    </div>
  </motion.div>
);

const DetailDivider = () => <div className="h-[1px] w-full bg-natural-accent my-6 md:my-8" />;

const HotelDetailModal = ({ hotel, onClose, onViewStays }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-10">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-natural-dark/70 backdrop-blur-lg" />
    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 w-full max-w-6xl bg-natural-cream rounded-[24px] sm:rounded-[40px] md:rounded-[60px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] flex flex-col lg:flex-row h-[94vh] lg:h-[85vh] max-h-[850px] modal-container">
      <div className="lg:w-1/2 h-56 sm:h-72 lg:h-full relative overflow-hidden bg-natural-accent">
        <Gallery parentId={hotel.id} fallbackImage={hotel.imageUrl} className="w-full h-full" />
        <div className="absolute top-4 left-4 md:top-8 md:left-8 flex gap-4">
          <button onClick={onClose} className="p-2 sm:p-3 md:p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"><ArrowLeft className="w-5 h-5 md:w-6 md:h-6"/></button>
        </div>
      </div>
      <div className="lg:w-1/2 p-6 sm:p-10 md:p-16 lg:p-24 overflow-y-auto flex flex-col selection:bg-natural-primary/20">
        <div className="mb-4 md:mb-10 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-natural-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-muted">{hotel.location}</span>
        </div>
        <h2 className="font-serif text-fluid-h1 text-natural-dark italic mb-6 md:mb-12 tracking-tighter leading-tight md:leading-none">{hotel.name}</h2>
        <p className="text-fluid-body text-natural-muted font-light italic leading-relaxed mb-10 md:mb-16">{hotel.description}</p>
        <DetailDivider />
        <div className="mb-10 md:mb-16">
          <h4 className="text-[10px] uppercase font-bold tracking-[0.3em] text-natural-dark mb-6 md:mb-8">The Sanctuary Map</h4>
          <div className="h-56 md:h-72 bg-natural-bg rounded-[32px] md:rounded-[40px] overflow-hidden border border-natural-accent relative">
             <iframe title="map" width="100%" height="100%" frameBorder="0" src={`https://www.google.com/maps/embed/v1/place?key=REPLACEME&q=${encodeURIComponent(hotel.name + ' ' + hotel.location)}`} />
             <div className="absolute inset-0 bg-natural-primary/5 pointer-events-none" />
          </div>
        </div>
        <button onClick={onViewStays} className="mt-auto w-full bg-natural-primary text-white py-5 md:py-6 rounded-full font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-natural-dark hover:-translate-y-1 transition-all flex items-center justify-center gap-4 text-[10px] md:text-sm">
          Explore Collection <ChevronRight className="w-5 h-5"/>
        </button>
      </div>
    </motion.div>
  </div>
);

const AccommodationDetailModal = ({ item, isBooking, bookingSuccess, onClose, onStartBooking, onAddToCart, initialCheckIn, initialCheckOut }: any) => {
  const isFormState = isBooking && !bookingSuccess;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-natural-dark/70 backdrop-blur-lg" />
      
      {isFormState ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-xl mx-auto flex justify-center items-center overflow-visible"
          onClick={e => e.stopPropagation()}
        >
          <BookingForm 
            accommodation={item} 
            onCancel={onClose} 
            onAddToCart={onAddToCart}
            initialCheckIn={initialCheckIn}
            initialCheckOut={initialCheckOut}
          />
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="relative z-10 w-full max-w-5xl bg-natural-cream rounded-[24px] sm:rounded-[36px] md:rounded-[50px] overflow-hidden shadow-2xl h-[94vh] md:h-auto md:min-h-[600px] flex overflow-y-auto md:overflow-visible modal-container"
          onClick={e => e.stopPropagation()}
        >
          {!isBooking ? (
            <div className="flex flex-col lg:flex-row w-full bg-natural-cream rounded-[24px] sm:rounded-[36px] md:rounded-[50px] overflow-hidden">
              <div className="lg:w-1/2 h-56 sm:h-72 lg:h-auto relative bg-natural-accent">
                <Gallery parentId={item.id} fallbackImage={item.imageUrl} className="w-full h-full" />
                <button onClick={onClose} className="absolute top-4 left-4 lg:hidden p-2 sm:p-3 bg-white/20 backdrop-blur-md rounded-full text-white"><ArrowLeft className="w-5 h-5"/></button>
              </div>
              <div className="lg:w-1/2 p-6 sm:p-10 md:p-16 flex flex-col selection:bg-natural-primary/20 bg-natural-cream">
                <button onClick={onClose} className="hidden lg:flex self-end p-2 hover:bg-natural-bg rounded-full mb-4"><ArrowLeft className="w-6 h-6 text-natural-muted"/></button>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-primary mb-4 md:mb-6">{item.type} Portfolio</span>
                <h2 className="font-serif text-fluid-h1 text-natural-dark italic mb-4 md:mb-8 tracking-tighter leading-tight">{item.name}</h2>
                <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-8 md:mb-10 pb-6 md:pb-8 border-b border-natural-accent">
                   <div className="flex items-center gap-2 text-xs md:text-sm font-bold"><Star className="w-4 h-4 text-natural-primary" /> {item.rating}</div>
                   <div className="flex items-center gap-2 text-xs md:text-sm font-bold"><MapPin className="w-4 h-4 text-natural-primary" /> {item.location}</div>
                </div>
                <p className="text-fluid-body text-natural-muted font-light italic leading-relaxed mb-10 md:mb-12">{item.description}</p>
                <div className="mt-auto flex items-center justify-between gap-4">
                  <div>
                    <span className="text-3xl md:text-4xl font-bold font-serif italic text-natural-dark">${item.price}</span>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-natural-muted ml-2 md:ml-4">/ night</span>
                  </div>
                  <button onClick={onStartBooking} className="bg-natural-primary text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-natural-dark transition-all text-xs">Reserve</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-8 sm:p-16 md:p-24 flex flex-col items-center text-center justify-center bg-natural-cream rounded-[32px] md:rounded-[50px] overflow-hidden">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 md:mb-10"><Star className="w-8 h-8 md:w-10 md:h-10 text-green-600"/></div>
              <h2 className="font-serif text-fluid-h1 italic text-natural-dark mb-4 md:mb-6 tracking-tighter text-center leading-tight">Sanctuary Requested.</h2>
              <p className="text-fluid-body text-natural-muted max-w-md font-light italic leading-relaxed mb-12 text-center">Our concierge will contact you within the hour to finalize your tropical escape.</p>
              <button onClick={onClose} className="bg-natural-primary text-white px-12 py-5 rounded-full font-bold uppercase tracking-[0.2em] shadow-xl text-sm">Complete</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
