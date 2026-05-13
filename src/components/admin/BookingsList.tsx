import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../../services/db';
import { Booking, Accommodation, Hotel } from '../../types';
import { SectionLabel, Input } from './Shared';
import { Check, X, Calendar, User, Mail, Phone, MessageSquare, History, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BookingsList = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Accommodation[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'current' | 'past'>('current');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [cancelModal, setCancelModal] = useState<{ id: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [b, r, h] = await Promise.all([
          dbService.getBookings(),
          dbService.getRooms(),
          dbService.getHotels()
        ]);
        setBookings(b || []);
        setRooms(r || []);
        setHotels(h || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStatusUpdate = async (id: string, status: Booking['status'], reason?: string) => {
    try {
      const updateData: any = { status };
      if (reason) updateData.cancellationReason = reason;
      
      await dbService.updateBooking(id, updateData);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status, cancellationReason: reason } : b));
      setCancelModal(null);
      setCancelReason('');
    } catch (error) {
      console.error(error);
      alert('Failed to update status');
    }
  };

  const categorizedBookings = useMemo(() => {
    const now = new Date();
    const current: Booking[] = [];
    const past: Booking[] = [];

    bookings.forEach(b => {
      const checkOutDate = new Date(b.checkOut);
      if (b.status === 'cancelled' || checkOutDate < now) {
        past.push(b);
      } else {
        current.push(b);
      }
    });

    const searchFilter = (b: Booking) => {
      const term = searchTerm.toLowerCase();
      return b.fullName.toLowerCase().includes(term) || 
             b.email.toLowerCase().includes(term) ||
             b.id.toLowerCase().includes(term);
    };

    return {
      current: current.filter(searchFilter),
      past: past.filter(searchFilter)
    };
  }, [bookings, searchTerm]);

  if (loading) return <div className="p-10 font-serif italic">Loading bookings...</div>;

  const displayList = view === 'current' ? categorizedBookings.current : categorizedBookings.past;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="font-serif text-4xl mb-2 italic">Bookings Management</h2>
          <p className="text-natural-muted text-sm italic font-light">Monitor and manage reservations across all hotels.</p>
        </div>

        <div className="flex bg-natural-bg p-1 rounded-full border border-natural-accent">
          <button 
            onClick={() => setView('current')}
            className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'current' ? 'bg-white shadow-sm text-natural-primary' : 'text-natural-muted hover:text-natural-dark'}`}
          >
            Current & Upcoming
          </button>
          <button 
            onClick={() => setView('past')}
            className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'past' ? 'bg-white shadow-sm text-natural-primary' : 'text-natural-muted hover:text-natural-dark'}`}
          >
            Past & Cancelled
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
        <Input 
          placeholder="Search by name, email or ID..."
          value={searchTerm}
          className="pl-14"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {displayList.map(booking => {
          const room = rooms.find(r => r.id === booking.roomId);
          const hotel = hotels.find(h => h.id === booking.hotelId);

          return (
            <motion.div 
              layout
              key={booking.id}
              className="bg-white rounded-[32px] p-8 border border-natural-accent shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row gap-8"
            >
              <div className="flex-1 space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    booking.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                    booking.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {booking.status}
                  </span>
                  <span className="text-[10px] font-bold text-natural-muted uppercase tracking-widest">ID: {booking.id.slice(0, 8)}</span>
                  <span className="text-[10px] font-bold text-natural-muted uppercase tracking-widest ml-auto">{new Date(booking.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <SectionLabel label="Guest Details" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-natural-dark"><User className="w-4 h-4 text-natural-primary" /> {booking.fullName}</div>
                      <div className="flex items-center gap-2 text-xs text-natural-muted"><Mail className="w-4 h-4" /> {booking.email}</div>
                      <div className="flex items-center gap-2 text-xs text-natural-muted"><Phone className="w-4 h-4" /> {booking.phone}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionLabel label="Stay Details" />
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-natural-dark">{room?.name || 'Loading room...'}</div>
                      <div className="text-xs text-natural-muted font-bold uppercase tracking-widest">{hotel?.name || 'Loading hotel...'}</div>
                      <div className="flex items-center gap-2 text-xs text-natural-muted mt-2"><Calendar className="w-4 h-4" /> {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionLabel label="Preferences" />
                    <div className="flex items-start gap-2 max-w-xs">
                      <MessageSquare className="w-4 h-4 text-natural-primary shrink-0 mt-1" />
                      <p className="text-xs text-natural-muted leading-relaxed italic">{booking.specialRequests || 'No special requests.'}</p>
                    </div>
                  </div>
                </div>

                {booking.cancellationReason && (
                   <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-1">Cancellation Reason</p>
                    <p className="text-xs text-red-600 italic font-medium leading-relaxed">{booking.cancellationReason}</p>
                  </div>
                )}
              </div>

              {view === 'current' && (
                <div className="xl:border-l border-natural-accent xl:pl-8 flex flex-row xl:flex-col justify-center gap-3">
                  {booking.status === 'pending' && (
                    <button 
                      onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                      className="p-4 bg-green-50 text-green-700 rounded-2xl hover:bg-green-100 transition-all flex items-center gap-3 font-bold text-xs uppercase tracking-widest"
                    >
                      <Check className="w-5 h-5" /> Confirm
                    </button>
                  )}
                  {booking.status !== 'cancelled' && (
                    <button 
                      onClick={() => setCancelModal({ id: booking.id })}
                      className="p-4 bg-red-50 text-red-700 rounded-2xl hover:bg-red-100 transition-all flex items-center gap-3 font-bold text-xs uppercase tracking-widest"
                    >
                      <X className="w-5 h-5" /> Cancel
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {displayList.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[32px] border border-natural-accent border-dashed">
            <History className="w-12 h-12 text-natural-muted mx-auto mb-4 opacity-20" />
            <p className="text-natural-muted font-serif italic text-lg">No {view} bookings found matching your search.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {cancelModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCancelModal(null)} className="fixed inset-0 bg-natural-dark/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 w-full max-w-lg bg-white rounded-[40px] p-10 md:p-12 shadow-2xl">
              <h3 className="font-serif text-3xl mb-4 italic">Confirm Cancellation</h3>
              <p className="text-natural-muted text-sm leading-relaxed mb-10 italic">Please provide a reason for cancelling this reservation. This information will be archived for our records.</p>
              
              <div className="mb-10">
                <SectionLabel label="Reason for Cancellation" />
                <textarea 
                  required
                  rows={4}
                  className="w-full bg-natural-bg border-none rounded-3xl p-6 outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm font-medium resize-none shadow-inner"
                  placeholder="e.g., Guest changed plans, Maintenance issue..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setCancelModal(null); setCancelReason(''); }}
                  className="flex-1 bg-natural-bg py-4 rounded-full font-bold uppercase tracking-widest text-[10px]"
                >
                  Go Back
                </button>
                <button 
                  disabled={!cancelReason.trim()}
                  onClick={() => handleStatusUpdate(cancelModal.id, 'cancelled', cancelReason)}
                  className="flex-1 bg-red-500 text-white py-4 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20 disabled:opacity-50"
                >
                  Verify Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
