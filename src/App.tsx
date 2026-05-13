import React, { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';

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

// Lazy load Admin to minimize initial bundle size and make site feel lighter
const Admin = lazy(() => import('./components/Admin').then(m => ({ default: m.Admin })));

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'accommodation' | 'weddings-events' | 'about' | 'contact' | 'my-bookings' | 'staff'>('home');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

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

  // Database and Supabase status state for debugging
  const [dbStatus, setDbStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/db-status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(() => {});
  }, []);

  // Ensure data is fresh when switching back to home
  useEffect(() => {
    if (activeTab === 'home') {
      refresh();
    }
  }, [activeTab]);

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
      <AnimatePresence>
        {loading && <LoadingPlane label="Ahsell Resorts" />}
      </AnimatePresence>
      
      <Navbar 
        activeTab={activeTab as any}
        onTabChange={handleTabChange}
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
                className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md border border-natural-accent px-6 py-2 rounded-full shadow-lg flex items-center gap-3"
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

            <main id="stays" className="flex-1">
              <FilterBar 
                onFilterChange={(f) => setFilters(prev => ({...prev, ...f}))} 
                currentFilter={filters} 
                hotels={hotels} 
              />

              <section id="stays-list" className="max-w-7xl mx-auto px-6 py-24">
                <div className="mb-20 text-center">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="font-serif text-5xl md:text-6xl mb-6 italic text-natural-dark tracking-tighter"
                  >
                    Our Curated Micro-Escapes.
                  </motion.h2>
                  <p className="text-natural-muted max-w-2xl mx-auto font-light text-lg italic">
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
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"
                >
                  {loading ? (
                    [1,2,3,4,5,6].map(i => <AccommodationSkeleton key={i} />)
                  ) : filteredItems.map((item, index) => (
                    <AccommodationCard 
                      key={item.id} 
                      item={item} 
                      index={index} 
                      onClick={() => setSelectedItem(item)}
                      onBook={(e) => handleStartBooking(e, item)}
                      disabled={!item.isAvailable}
                    />
                  ))}
                </motion.div>

                {filteredItems.length === 0 && (
                  <div className="py-40 text-center">
                    <p className="text-natural-muted text-xl italic font-light">No stays match your current preferences.</p>
                    <button 
                      onClick={() => setFilters({ type: 'All', priceRange: [0, 5000], minRating: 0, location: 'All', checkIn: '', checkOut: '' })}
                      className="mt-8 text-natural-primary font-bold uppercase text-[10px] tracking-[0.4em] border-b border-natural-primary pb-2 hover:opacity-70 transition-opacity"
                    >
                      Reset All Filters
                    </button>
                  </div>
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
              <div className="mb-28 text-center">
                <h1 className="font-serif text-6xl md:text-9xl italic text-natural-dark mb-10 tracking-tighter">The Portfolios.</h1>
                <p className="text-natural-muted max-w-3xl mx-auto text-xl md:text-2xl font-light italic leading-relaxed">
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

      {/* Modals */}
      <AnimatePresence>
        {selectedHotel && (
          <HotelDetailModal 
            hotel={selectedHotel} 
            onClose={() => setSelectedHotel(null)} 
            onViewStays={() => {
              setSelectedHotel(null);
              setFilters(prev => ({ ...prev, location: selectedHotel.location }));
              setActiveTab('home');
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
            onBookingSuccess={() => {
              setBookingSuccess(true);
              refresh();
            }}
            initialCheckIn={filters.checkIn}
            initialCheckOut={filters.checkOut}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { Skeleton } from './components/ui/Skeleton';

// --- Sub-components (Kept here as they are specific to App's view) ---

const AccommodationSkeleton = () => (
  <div className="bg-white rounded-[40px] overflow-hidden flex flex-col border border-natural-accent">
    <Skeleton className="h-72 rounded-none" />
    <div className="p-10 space-y-6">
      <div className="flex justify-between">
        <div className="space-y-4 w-full">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="pt-6 border-t border-natural-accent flex justify-between items-center">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  </div>
);

const AccommodationCard = ({ item, index, onClick, onBook, disabled }: any) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: index * 0.1 }}
    onClick={disabled ? undefined : onClick}
    className={`bg-white rounded-[40px] overflow-hidden flex flex-col shadow-sm border border-natural-accent group hover:shadow-2xl transition-all cursor-pointer ${disabled ? 'opacity-70 grayscale-[0.5]' : ''}`}
  >
    <div className="h-72 bg-natural-accent overflow-hidden relative">
      <img 
        src={item.imageUrl} 
        alt={item.name} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
      />
      <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-natural-primary border border-natural-accent">
        {item.type}
      </div>
      {disabled && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <span className="bg-white text-natural-dark px-6 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest shadow-xl">Already Booked</span>
        </div>
      )}
    </div>
    <div className="p-10 flex flex-col flex-1">
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-serif text-3xl text-natural-dark italic group-hover:text-natural-primary transition-colors">{item.name}</h3>
        <span className="flex items-center text-xs font-bold text-natural-primary bg-natural-primary/5 px-3 py-1 rounded-full">
          <Star className="w-3 h-3 mr-1.5 fill-current" /> {item.rating}
        </span>
      </div>
      <p className="text-sm text-natural-muted leading-relaxed mb-8 flex-1 italic font-light">
        {item.description}
      </p>
      <div className="mt-auto flex items-center justify-between pt-8 border-t border-natural-bg">
        <div>
          <span className="text-3xl font-bold text-natural-dark">${item.price}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-natural-muted ml-3">/ night</span>
        </div>
        {!disabled && (
          <button 
            onClick={onBook}
            className="bg-natural-primary text-white p-4 rounded-full hover:bg-natural-dark transition-all shadow-lg active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
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
    className="group cursor-pointer"
  >
    <div className="h-[600px] rounded-[60px] overflow-hidden mb-10 relative bg-natural-accent shadow-2xl">
      <img 
        src={hotel.imageUrl} 
        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[2000ms]" 
        alt={hotel.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-natural-dark/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex items-end p-12">
        <p className="text-white text-sm font-light italic max-w-sm">
          {hotel.description}
        </p>
      </div>
    </div>
    <div className="px-6">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-4 h-4 text-natural-primary" />
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-muted">{hotel.location}</span>
      </div>
      <h3 className="font-serif text-5xl text-natural-dark group-hover:italic transition-all duration-500 tracking-tighter">{hotel.name}</h3>
    </div>
  </motion.div>
);

const DetailDivider = () => <div className="h-[1px] w-full bg-natural-accent my-8" />;

const HotelDetailModal = ({ hotel, onClose, onViewStays }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-10">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-natural-dark/70 backdrop-blur-lg" />
    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 w-full max-w-6xl bg-white rounded-[60px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] flex flex-col lg:flex-row h-[90vh]">
      <div className="lg:w-1/2 h-full relative overflow-hidden bg-natural-accent">
        <img src={hotel.imageUrl} className="w-full h-full object-cover" />
        <div className="absolute top-10 left-10 flex gap-4">
          <button onClick={onClose} className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"><ArrowLeft className="w-6 h-6"/></button>
        </div>
      </div>
      <div className="lg:w-1/2 p-16 md:p-24 overflow-y-auto flex flex-col selection:bg-natural-primary/20">
        <div className="mb-10 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-natural-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-muted">{hotel.location}</span>
        </div>
        <h2 className="font-serif text-6xl md:text-7xl text-natural-dark italic mb-12 tracking-tighter leading-none">{hotel.name}</h2>
        <p className="text-xl text-natural-muted font-light italic leading-relaxed mb-16">{hotel.description}</p>
        <DetailDivider />
        <div className="mb-16">
          <h4 className="text-[10px] uppercase font-bold tracking-[0.3em] text-natural-dark mb-8">The Sanctuary Map</h4>
          <div className="h-72 bg-natural-bg rounded-[40px] overflow-hidden border border-natural-accent relative">
             <iframe title="map" width="100%" height="100%" frameBorder="0" src={`https://www.google.com/maps/embed/v1/place?key=REPLACEME&q=${encodeURIComponent(hotel.name + ' ' + hotel.location)}`} />
             <div className="absolute inset-0 bg-natural-primary/5 pointer-events-none" />
          </div>
        </div>
        <button onClick={onViewStays} className="mt-auto w-full bg-natural-primary text-white py-6 rounded-full font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-natural-dark hover:-translate-y-1 transition-all flex items-center justify-center gap-4">
          Explore This Collection <ChevronRight className="w-5 h-5"/>
        </button>
      </div>
    </motion.div>
  </div>
);

const AccommodationDetailModal = ({ item, isBooking, bookingSuccess, onClose, onStartBooking, onBookingSuccess, initialCheckIn, initialCheckOut }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-10">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-natural-dark/70 backdrop-blur-lg" />
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-5xl bg-white rounded-[50px] overflow-hidden shadow-2xl min-h-[600px] flex">
      {!isBooking ? (
        <div className="flex flex-col md:flex-row w-full">
          <div className="md:w-1/2 relative bg-natural-accent">
            <img src={item.imageUrl} className="w-full h-full object-cover" />
          </div>
          <div className="md:w-1/2 p-16 flex flex-col selection:bg-natural-primary/20">
            <button onClick={onClose} className="self-end p-2 hover:bg-natural-bg rounded-full mb-4"><ArrowLeft className="w-6 h-6 text-natural-muted"/></button>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-primary mb-6">{item.type} Portfolios</span>
            <h2 className="font-serif text-5xl md:text-6xl text-natural-dark italic mb-8 tracking-tighter">{item.name}</h2>
            <div className="flex items-center gap-6 mb-10 pb-8 border-b border-natural-accent">
               <div className="flex items-center gap-2 text-sm font-bold"><Star className="w-4 h-4 text-natural-primary" /> {item.rating}</div>
               <div className="flex items-center gap-2 text-sm font-bold"><MapPin className="w-4 h-4 text-natural-primary" /> {item.location}</div>
            </div>
            <p className="text-lg text-natural-muted font-light italic leading-relaxed mb-12">{item.description}</p>
            <div className="mt-auto flex items-center justify-between">
              <div>
                <span className="text-4xl font-bold font-serif italic text-natural-dark">${item.price}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-natural-muted ml-4">/ night</span>
              </div>
              <button onClick={onStartBooking} className="bg-natural-primary text-white px-10 py-5 rounded-full font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-natural-dark transition-all">Reserve</button>
            </div>
          </div>
        </div>
      ) : bookingSuccess ? (
        <div className="w-full p-24 flex flex-col items-center text-center justify-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-10"><Star className="w-10 h-10 text-green-600"/></div>
          <h2 className="font-serif text-6xl italic text-natural-dark mb-6 tracking-tighter text-center">Sanctuary Requested.</h2>
          <p className="text-xl text-natural-muted max-w-md font-light italic leading-relaxed mb-12 text-center">Our concierge will contact you within the hour to finalize your tropical escape.</p>
          <button onClick={onClose} className="bg-natural-primary text-white px-12 py-5 rounded-full font-bold uppercase tracking-[0.2em] shadow-xl">Complete</button>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center p-10 bg-natural-bg/50">
          <BookingForm 
            accommodation={item} 
            onCancel={onClose} 
            onSuccess={onBookingSuccess}
            initialCheckIn={initialCheckIn}
            initialCheckOut={initialCheckOut}
          />
        </div>
      )}
    </motion.div>
  </div>
);
