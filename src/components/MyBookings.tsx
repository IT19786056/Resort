import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { auth } from '../lib/auth';
import { Booking } from '../types';
import { BANK_DETAILS } from '../constants';
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, MapPin, Clock, XCircle, AlertCircle, CheckCircle2, Upload, Landmark, FileCheck2 } from 'lucide-react';

export const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data: { user } } = await auth.getUser();
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
    const bookingIdToCancel = cancelModalId;
    const cancelReasonText = reason;

    // Save current bookings state for rollback
    const originalBookings = [...bookings];

    // Optimistically update local booking state instantly
    const optimisticBookings = bookings.map(b => {
      if (b.id === bookingIdToCancel) {
        return {
          ...b,
          status: 'cancelled' as const,
          cancellationReason: cancelReasonText
        };
      }
      return b;
    });
    setBookings(optimisticBookings);

    // Dismiss the cancellation dialog instantly for rapid responsive UX
    setCancelModalId(null);
    setReason('');

    try {
      await dbService.updateBooking(bookingIdToCancel, { 
        status: 'cancelled', 
        cancellationReason: cancelReasonText 
      });
      
      // Quiet background refresh to secure exact DB state correlation
      const { data: { user } } = await auth.getUser();
      if (user) {
        const data = await dbService.getUserBookings(user.id);
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      // Revert upon server failures
      setBookings(originalBookings);
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const handleSlipUpload = async (bookingId: string, file: File) => {
    setUploadError(null);
    if (!isCloudinaryConfigured) {
      setUploadError('File uploads are not configured. Please reply to your booking email with the slip instead.');
      return;
    }
    setUploadingId(bookingId);
    try {
      const { url } = await uploadToCloudinary(file, { folder: 'payment-slips' });
      const updated = await dbService.uploadPaymentSlip(bookingId, url);
      setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, ...updated } : b)));
    } catch (err: any) {
      console.error('Slip upload failed:', err);
      setUploadError(err.message || 'Failed to upload payment slip. Please try again.');
    } finally {
      setUploadingId(null);
    }
  };

  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-50 text-green-600 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      case 'payment_review': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const getStatusLabel = (status: Booking['status']) =>
    status === 'payment_review' ? 'Payment Review' : status;

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
        <div className="bg-natural-cream rounded-[32px] p-12 text-center shadow-sm border border-natural-bg">
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
              className="bg-natural-cream rounded-[32px] overflow-hidden shadow-sm border border-natural-bg hover:shadow-md transition-all p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(booking.status)}`}>
                      {getStatusLabel(booking.status)}
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

              {/* Bank-transfer payment section — shown until the booking is confirmed/cancelled */}
              {(booking.status === 'pending' || booking.status === 'payment_review') && (
                <div className="mt-6 pt-6 border-t border-natural-bg">
                  <div className="flex items-center gap-2 mb-4">
                    <Landmark className="w-4 h-4 text-natural-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-natural-dark">Complete Your Payment</p>
                  </div>

                  <div className="bg-natural-bg rounded-2xl p-5 grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                    {[
                      ['Bank', BANK_DETAILS.bankName],
                      ['Account Name', BANK_DETAILS.accountName],
                      ['Account Number', BANK_DETAILS.accountNumber],
                      ['Branch', BANK_DETAILS.branch],
                      ['SWIFT', BANK_DETAILS.swift],
                      ['Payment Reference', booking.id.slice(0, 8).toUpperCase()],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3 text-sm">
                        <span className="text-natural-muted">{label}</span>
                        <span className="font-bold text-natural-dark text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-natural-muted mb-4 leading-relaxed">
                    Transfer the amount using the <strong>Payment Reference</strong> above, then upload your bank slip here.
                    Our team will verify it and send your confirmation.
                  </p>

                  {booking.status === 'payment_review' && booking.paymentSlipUrl && (
                    <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4 text-xs font-bold">
                      <FileCheck2 className="w-4 h-4 shrink-0" />
                      <span>Slip received — under review.</span>
                      <a href={booking.paymentSlipUrl} target="_blank" rel="noreferrer" className="ml-auto underline">View slip</a>
                    </div>
                  )}

                  <label className={`inline-flex items-center justify-center gap-2 cursor-pointer bg-natural-primary text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-natural-dark transition-all ${uploadingId === booking.id ? 'opacity-60 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4" />
                    {uploadingId === booking.id
                      ? 'Uploading...'
                      : booking.paymentSlipUrl ? 'Replace Slip' : 'Upload Payment Slip'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={uploadingId === booking.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlipUpload(booking.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {uploadError && uploadingId === null && (
                    <p className="text-xs text-red-500 mt-3">{uploadError}</p>
                  )}
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
              className="relative w-full max-w-md bg-natural-cream rounded-[40px] p-10 overflow-hidden modal-container"
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
