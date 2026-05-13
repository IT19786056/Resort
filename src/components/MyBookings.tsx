import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../lib/supabase';
import { Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, MapPin, Clock, XCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

export const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const data = await dbService.getUserBookings(user.id);
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelModalId || !reason.trim()) return;
    setSubmitting(true);
    try {
      await dbService.updateBooking(cancelModalId, { 
        status: 'cancelled', 
        cancellationReason: reason 
      });
      await fetchBookings();
      setCancelModalId(null);
      setReason('');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-50 text-green-600 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-natural-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif italic text-natural-dark">Loading your journey...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12">
        <h1 className="font-serif text-4xl font-bold text-natural-dark italic mb-2">My Bookings</h1>
        <p className="text-natural-muted">Manage your upcoming retreats and past holidays.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center shadow-sm border border-natural-bg">
          <Calendar className="w-16 h-16 text-natural-primary/20 mx-auto mb-6" />
          <h2 className="text-2xl font-serif font-bold text-natural-dark italic mb-2">No Bookings Yet</h2>
          <p className="text-natural-muted mb-8">Your next adventure is just a few clicks away.</p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-natural-primary text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all"
          >
            Explore Resorts
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => (
            <motion.div 
              key={booking.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-natural-bg hover:shadow-md transition-all p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className="text-xs text-natural-muted">
                      Booked on {new Date(booking.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-serif font-bold text-natural-dark italic">
                    {booking.hotelId && "Luxury Escape"} {/* Simplified, would usually fetch hotel name */}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-natural-muted">
                      <Calendar className="w-4 h-4 text-natural-primary" />
                      <span className="text-sm font-medium">
                        {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-natural-muted">
                      <Users className="w-4 h-4 text-natural-primary" />
                      <span className="text-sm font-medium">{booking.guests} Guests</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[140px]">
                  {booking.status !== 'cancelled' && (
                    <button 
                      onClick={() => setCancelModalId(booking.id)}
                      className="w-full border border-red-100 text-red-500 hover:bg-red-50 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  )}
                  {booking.status === 'confirmed' && (
                    <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 py-3 rounded-full text-xs font-bold uppercase tracking-widest">
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmed
                    </div>
                  )}
                </div>
              </div>

              {booking.cancellationReason && (
                <div className="mt-6 pt-6 border-t border-natural-bg flex items-start gap-3 bg-red-50/50 p-4 rounded-2xl">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Cancellation Reason</p>
                    <p className="text-sm text-natural-dark italic">"{booking.cancellationReason}"</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      <AnimatePresence>
        {cancelModalId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCancelModalId(null)}
              className="absolute inset-0 bg-natural-dark/60 backdrop-blur-md" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-8">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <h2 className="text-3xl font-serif font-bold text-natural-dark italic mb-4">Cancel Booking?</h2>
              <p className="text-natural-muted mb-8 leading-relaxed">
                Please provide a reason for cancelling your stay. This helps us improve our service.
              </p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Reason for Cancellation</label>
                  <textarea 
                    autoFocus
                    className="w-full bg-natural-bg rounded-3xl py-4 px-6 outline-none focus:ring-2 focus:ring-red-500/10 transition-all font-medium text-sm min-h-[120px] resize-none"
                    placeholder="E.g. Change of plans, family emergency..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setCancelModalId(null)}
                    disabled={submitting}
                    className="flex-1 bg-natural-bg text-natural-dark py-4 rounded-full font-bold uppercase tracking-widest hover:bg-natural-bg/80 transition-all"
                  >
                    Keep It
                  </button>
                  <button 
                    onClick={handleCancel}
                    disabled={submitting || reason.length < 5}
                    className="flex-1 bg-red-500 text-white py-4 rounded-full font-bold uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                  >
                    {submitting ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
