import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { dbService } from '../services/db';
import { Accommodation } from '../types';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserAuth } from './UserAuth';

interface BookingFormProps {
  accommodation: Accommodation;
  onCancel: () => void;
  onSuccess: () => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
}

export const BookingForm = ({ 
  accommodation, 
  onCancel, 
  onSuccess,
  initialCheckIn = '',
  initialCheckOut = ''
}: BookingFormProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    guests: 1,
    specialRequests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setFormData(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || prev.fullName,
          email: user.email || prev.email
        }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setFormData(prev => ({
          ...prev,
          fullName: u.user_metadata?.full_name || prev.fullName,
          email: u.email || prev.email
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuth(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const checkInDate = new Date(formData.checkIn);
      checkInDate.setHours(14, 0, 0, 0); // 2:00 PM
      
      const checkOutDate = new Date(formData.checkOut);
      checkOutDate.setHours(11, 0, 0, 0); // 11:00 AM

      // Synchronize user profile to database first to ensure foreign key exists
      await dbService.saveCustomerProfile(user.id, {
        email: user.email || formData.email,
        displayName: user.user_metadata?.full_name || formData.fullName,
        photoURL: user.user_metadata?.avatar_url || null,
        createdAt: new Date().toISOString()
      });

      const bookingData = {
        ...formData,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        roomId: accommodation.id,
        hotelId: accommodation.hotelId,
        userId: user.id,
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };
      
      await dbService.addBooking(bookingData);
      onSuccess();
    } catch (error) {
      console.error(error);
      alert('Failed to place booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user && !showAuth) {
    return (
      <div className="bg-white p-12 rounded-[40px] text-center max-w-lg w-full shadow-2xl">
        <h2 className="font-serif text-4xl italic text-natural-dark mb-6">Access Required.</h2>
        <p className="text-natural-muted mb-10 leading-relaxed italic">
          To provide a personalized sanctuary experience and secure your reservation, please sign in or create an account.
        </p>
        <button 
          onClick={() => setShowAuth(true)}
          className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all hover:bg-natural-dark active:scale-95"
        >
          Begin Journey with Account
        </button>
      </div>
    );
  }

  if (showAuth) {
    return <UserAuth onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />;
  }

  return (
    <div className="bg-white p-8 rounded-[32px] max-w-xl w-full selection:bg-natural-primary/20">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-serif text-3xl italic text-natural-dark">Book Now</h3>
        <button onClick={onCancel} className="p-2 hover:bg-natural-bg rounded-full transition-colors">
          <X className="w-6 h-6 text-natural-muted" />
        </button>
      </div>

      <div className="mb-8 p-4 bg-natural-bg rounded-2xl flex items-center gap-4">
        <img src={accommodation.imageUrl || undefined} alt={accommodation.name} className="w-16 h-16 rounded-xl object-cover" />
        <div>
          <div className="text-sm font-bold text-natural-dark">{accommodation.name}</div>
          <div className="text-xs text-natural-muted uppercase tracking-widest">{accommodation.location}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4">Full Name</label>
          <input 
            required
            type="text" 
            className="w-full bg-natural-bg border-none rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
            value={formData.fullName}
            onChange={e => setFormData({...formData, fullName: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4">Email Address</label>
            <input 
              required
              type="email" 
              className="w-full bg-natural-bg border-none rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4">Phone Number</label>
            <input 
              required
              type="tel" 
              className="w-full bg-natural-bg border-none rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4">Check-In (From 2:00 PM)</label>
            <input 
              required
              type="date" 
              className="w-full bg-natural-bg border-none rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
              value={formData.checkIn.split('T')[0]}
              onChange={e => setFormData({...formData, checkIn: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4">Check-Out (By 11:00 AM)</label>
            <input 
              required
              type="date" 
              className="w-full bg-natural-bg border-none rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
              value={formData.checkOut.split('T')[0]}
              onChange={e => setFormData({...formData, checkOut: e.target.value})}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4">Guests</label>
          <select 
            className="w-full bg-natural-bg border-none rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium appearance-none"
            value={formData.guests}
            onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
          >
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
          </select>
        </div>
        
        <button 
          disabled={isSubmitting}
          type="submit" 
          className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all shadow-xl shadow-natural-primary/20 disabled:opacity-50"
        >
          {isSubmitting ? 'Wait a moment...' : 'Confirm My Reservation'}
        </button>
      </form>
    </div>
  );
};
