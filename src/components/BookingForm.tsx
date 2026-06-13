import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { dbService } from '../services/db';
import { supabase } from '../lib/supabase';
import { Accommodation } from '../types';
import { PhoneInputField } from './PhoneInputField';
import { DatePickerInput } from './ui/DatePickerInput';

interface BookingFormProps {
  accommodation: Accommodation;
  onCancel: () => void;
  onAddToCart: (item: any) => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
}

export const BookingForm = ({ 
  accommodation, 
  onCancel, 
  onAddToCart,
  initialCheckIn = '',
  initialCheckOut = ''
}: BookingFormProps) => {
  const getMinCheckInDate = () => {
    const now = new Date();
    const tenAM = new Date();
    tenAM.setHours(10, 0, 0, 0);
    
    const minDate = new Date();
    if (now.getTime() >= tenAM.getTime()) {
      minDate.setDate(now.getDate() + 1);
    }
    
    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMinCheckOutDate = (checkInStr: string) => {
    const checkInDate = checkInStr ? new Date(checkInStr) : new Date(getMinCheckInDate());
    checkInDate.setDate(checkInDate.getDate() + 1);
    const year = checkInDate.getFullYear();
    const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
    const day = String(checkInDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const minCheckIn = getMinCheckInDate();
  const rawInitialCheckIn = initialCheckIn ? initialCheckIn.split('T')[0] : '';
  const finalInitialCheckIn = !rawInitialCheckIn || rawInitialCheckIn < minCheckIn ? minCheckIn : rawInitialCheckIn;
  
  const minCheckOut = getMinCheckOutDate(finalInitialCheckIn);
  const rawInitialCheckOut = initialCheckOut ? initialCheckOut.split('T')[0] : '';
  const finalInitialCheckOut = !rawInitialCheckOut || rawInitialCheckOut <= finalInitialCheckIn ? minCheckOut : rawInitialCheckOut;

  const [formData, setFormData] = useState({
    checkIn: finalInitialCheckIn,
    checkOut: finalInitialCheckOut,
    guests: 1
  });
  const [roomCount, setRoomCount] = useState(1);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Authenticated user state
  const [user, setUser] = useState<any>(null);
  const [visitorDetails, setVisitorDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialRequests: ''
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (user) {
      // Fill immediately from auth metadata (zero latency)
      setVisitorDetails(prev => ({
        ...prev,
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || ''
      }));
      // Customer DB table is the authoritative source for phone — auth metadata may not have it
      const profileLookup = user.id
        ? dbService.getCustomerProfile(user.id)
        : Promise.resolve(null);
      profileLookup
        .then(async (profile) => {
          // If ID-based lookup found nothing, retry with email
          if (!profile && user.email) {
            return dbService.getCustomerProfile(user.email);
          }
          return profile;
        })
        .then(profile => {
          if (!profile) return;
          setVisitorDetails((prev: { fullName: string; email: string; phone: string; specialRequests: string }) => ({
            ...prev,
            ...(profile.phone ? { phone: profile.phone } : {}),
            ...(profile.displayName && !user.user_metadata?.full_name ? { fullName: profile.displayName } : {})
          }));
        })
        .catch(e => console.warn('[BookingForm] getCustomerProfile failed:', e));
    } else {
      setVisitorDetails(prev => ({
        ...prev,
        fullName: '',
        email: '',
        phone: ''
      }));
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const checkAvailability = async () => {
      if (!formData.checkIn || !formData.checkOut) return;
      
      setCheckingAvailability(true);
      try {
        const result = await dbService.getRoomAvailability(
          accommodation.id,
          formData.checkIn,
          formData.checkOut
        );
        if (active) {
          setAvailableCount(result.remainingQuantity);
        }
      } catch (err) {
        console.error('Failed to check room availability:', err);
        if (active) setAvailableCount(accommodation.quantity || 1);
      } finally {
        if (active) setCheckingAvailability(false);
      }
    };

    checkAvailability();
    return () => { active = false; };
  }, [formData.checkIn, formData.checkOut, accommodation.id]);

  const maxGuests = (accommodation.maxGuests || 2) * roomCount;

  const handleRoomCountChange = (delta: number) => {
    const next = Math.max(1, roomCount + delta);
    setRoomCount(next);
    // Auto-clamp guests to new max
    setFormData((prev: { checkIn: string; checkOut: string; guests: number }) => ({
      ...prev,
      guests: Math.min(prev.guests, (accommodation.maxGuests || 2) * next)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.checkIn || !formData.checkOut) {
      alert('Please select check-in and check-out dates.');
      return;
    }
    if (availableCount === 0) {
      alert('This accommodation is fully booked for the selected dates.');
      return;
    }
    if (availableCount !== null && roomCount > availableCount) {
      alert(`Only ${availableCount} room${availableCount === 1 ? '' : 's'} available for the selected dates. Please reduce the room count and try again.`);
      return;
    }

    onAddToCart({
      accommodation,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: formData.guests,
      roomCount: roomCount,
      fullName: visitorDetails.fullName,
      email: visitorDetails.email,
      phone: visitorDetails.phone,
      specialRequests: visitorDetails.specialRequests
    });
  };

  return (
    <div className="bg-natural-cream rounded-[32px] max-w-xl w-full selection:bg-natural-primary/20 shadow-2xl border border-natural-accent max-h-[90vh] flex flex-col overflow-hidden">
      <div className="p-8 overflow-y-auto flex-1 pr-6 hover:pr-6 custom-modal-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-3xl italic text-natural-dark">Check Availability</h3>
          <button onClick={onCancel} className="p-2 hover:bg-natural-bg rounded-full transition-colors">
            <X className="w-6 h-6 text-natural-muted" />
          </button>
        </div>

      <div className="mb-6 p-4 bg-natural-bg rounded-2xl flex items-center gap-4 border border-natural-accent">
        <img src={accommodation.imageUrl || undefined} alt={accommodation.name} className="w-16 h-16 rounded-xl object-cover" />
        <div>
          <div className="text-sm font-bold text-natural-dark">{accommodation.name}</div>
          <div className="text-xs text-natural-muted uppercase tracking-widest">{accommodation.location}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">Check-In</label>
            <DatePickerInput
              fieldStyle
              label="Check-In"
              value={formData.checkIn}
              min={minCheckIn}
              onChange={newCheckIn => {
                if (!newCheckIn) {
                  setFormData((prev: { checkIn: string; checkOut: string; guests: number }) => ({ ...prev, checkIn: '', checkOut: '' }));
                  return;
                }
                const nextMinCheckOut = getMinCheckOutDate(newCheckIn);
                setFormData((prev: { checkIn: string; checkOut: string; guests: number }) => ({
                  ...prev,
                  checkIn: newCheckIn,
                  checkOut: prev.checkOut <= newCheckIn ? nextMinCheckOut : prev.checkOut
                }));
              }}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">Check-Out</label>
            <DatePickerInput
              fieldStyle
              label="Check-Out"
              value={formData.checkOut}
              min={getMinCheckOutDate(formData.checkIn)}
              onChange={val => setFormData((prev: { checkIn: string; checkOut: string; guests: number }) => ({ ...prev, checkOut: val }))}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Rooms stepper */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">Rooms / Units</label>
            <div className="flex items-center justify-between bg-natural-bg border border-natural-accent rounded-full px-2 py-2">
              <button
                type="button"
                onClick={() => handleRoomCountChange(-1)}
                disabled={roomCount <= 1}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-natural-accent text-natural-dark hover:border-natural-primary hover:text-natural-primary transition-all font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="font-bold text-natural-dark text-sm min-w-[2rem] text-center">{roomCount}</span>
              <button
                type="button"
                onClick={() => handleRoomCountChange(1)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-natural-primary text-white hover:bg-natural-dark transition-all font-bold text-base"
              >
                +
              </button>
            </div>
            {availableCount === 0 && (
              <p className="text-[9px] text-red-500 font-bold mt-1.5 ml-4 leading-tight">
                Fully booked for selected dates
              </p>
            )}
          </div>

          {/* Guests stepper */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">Guests</label>
            <div className="flex items-center justify-between bg-natural-bg border border-natural-accent rounded-full px-2 py-2">
              <button
                type="button"
                onClick={() => setFormData((prev: { checkIn: string; checkOut: string; guests: number }) => ({ ...prev, guests: Math.max(1, prev.guests - 1) }))}
                disabled={formData.guests <= 1}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-natural-accent text-natural-dark hover:border-natural-primary hover:text-natural-primary transition-all font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="font-bold text-natural-dark text-sm min-w-[2rem] text-center">{formData.guests}</span>
              <button
                type="button"
                onClick={() => setFormData((prev: { checkIn: string; checkOut: string; guests: number }) => ({ ...prev, guests: Math.min(prev.guests + 1, maxGuests) }))}
                disabled={formData.guests >= maxGuests}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-natural-primary text-white hover:bg-natural-dark transition-all font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            <p className="text-[9px] text-natural-muted mt-1.5 ml-4 leading-tight">
              Max {maxGuests} guests ({accommodation.maxGuests || 2} per room)
            </p>
          </div>
        </div>

        {/* Guest Information Details */}
        <div className="space-y-4 pt-4 border-t border-[#EAE5E0] mt-2">
          <h4 className="font-serif italic text-lg text-natural-dark tracking-wide">Guest Details</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase font-bold text-natural-muted mb-1.5 tracking-widest ml-4 font-mono">Full Name</label>
                <input 
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full bg-natural-bg border border-natural-accent rounded-full px-5 py-3 text-xs outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark"
                  value={visitorDetails.fullName}
                  onChange={e => setVisitorDetails({ ...visitorDetails, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-natural-muted mb-1.5 tracking-widest ml-4 font-mono">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-natural-bg border border-natural-accent rounded-full px-5 py-3 text-xs outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark"
                  value={visitorDetails.email}
                  onChange={e => setVisitorDetails({ ...visitorDetails, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-natural-muted mb-1.5 tracking-widest ml-4 font-mono">Phone Number</label>
                <PhoneInputField 
                  id="booking-form-phone-input"
                  required
                  value={visitorDetails.phone}
                  onChange={val => setVisitorDetails({ ...visitorDetails, phone: val })}
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-natural-muted mb-1.5 tracking-widest ml-4 font-mono">Special Requests (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="E.g. room preference, dietary needs, special occasions..."
                  className="w-full bg-natural-bg border border-natural-accent rounded-2xl px-5 py-3 text-xs outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark resize-none"
                  value={visitorDetails.specialRequests}
                  onChange={e => setVisitorDetails({ ...visitorDetails, specialRequests: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
        
        <button 
          disabled={checkingAvailability || availableCount === 0}
          type="submit" 
          className="w-full bg-natural-primary text-white py-4.5 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all shadow-xl shadow-natural-primary/20 disabled:opacity-50 text-[10px] mt-2 cursor-pointer"
        >
          {availableCount === 0 ? 'Fully Booked for Selected Dates' : 'Add to Booking Cart'}
        </button>
      </form>
      </div>
    </div>
  );
};
