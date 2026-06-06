import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { dbService } from '../services/db';
import { Accommodation } from '../types';

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
          if (result.remainingQuantity > 0 && roomCount > result.remainingQuantity) {
            setRoomCount(1);
          }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (availableCount === 0 || roomCount > (availableCount || 1)) {
      alert('Selected quantity is not available for these dates.');
      return;
    }

    onAddToCart({
      accommodation,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: formData.guests,
      roomCount: roomCount
    });
  };

  return (
    <div className="bg-natural-cream p-8 rounded-[32px] max-w-xl w-full selection:bg-natural-primary/20 shadow-2xl border border-natural-accent">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-serif text-3xl italic text-natural-dark">Check Availability</h3>
        <button onClick={onCancel} className="p-2 hover:bg-natural-bg rounded-full transition-colors">
          <X className="w-6 h-6 text-natural-muted" />
        </button>
      </div>

      <div className="mb-8 p-4 bg-natural-bg rounded-2xl flex items-center gap-4 border border-natural-accent">
        <img src={accommodation.imageUrl || undefined} alt={accommodation.name} className="w-16 h-16 rounded-xl object-cover" />
        <div>
          <div className="text-sm font-bold text-natural-dark">{accommodation.name}</div>
          <div className="text-xs text-natural-muted uppercase tracking-widest">{accommodation.location}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">Check-In</label>
            <input 
              required
              type="date" 
              min={minCheckIn}
              className="w-full bg-natural-bg border border-natural-accent rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark"
              value={formData.checkIn.split('T')[0]}
              onChange={e => {
                const newCheckIn = e.target.value;
                const nextMinCheckOut = getMinCheckOutDate(newCheckIn);
                setFormData(prev => ({
                  ...prev,
                  checkIn: newCheckIn,
                  checkOut: prev.checkOut <= newCheckIn ? nextMinCheckOut : prev.checkOut
                }));
              }}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">Check-Out</label>
            <input 
              required
              type="date" 
              min={getMinCheckOutDate(formData.checkIn)}
              className="w-full bg-natural-bg border border-natural-accent rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark"
              value={formData.checkOut.split('T')[0]}
              onChange={e => setFormData({...formData, checkOut: e.target.value})}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">Guests</label>
            <select 
              className="w-full bg-natural-bg border border-natural-accent rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark appearance-none"
              value={formData.guests}
              onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
            >
              {[1,2,3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-natural-muted mb-2 tracking-widest ml-4 font-mono">
              Rooms / Units Count
            </label>
            {checkingAvailability ? (
              <div className="w-full bg-natural-bg border border-natural-accent rounded-full px-6 py-4 text-xs italic text-natural-muted">
                Checking availability...
              </div>
            ) : availableCount === null ? (
              <div className="w-full bg-natural-bg border border-natural-accent rounded-full px-6 py-4 text-xs italic text-natural-muted">
                Select dates first
              </div>
            ) : availableCount === 0 ? (
              <div className="w-full bg-red-50 text-red-600 border border-red-200 rounded-full px-6 py-4 text-xs font-bold text-center">
                Fully Booked
              </div>
            ) : (
              <select 
                className="w-full bg-natural-bg border border-natural-accent rounded-full px-6 py-4 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-natural-dark appearance-none"
                value={roomCount}
                onChange={e => setRoomCount(parseInt(e.target.value))}
              >
                {Array.from({ length: availableCount }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Room / Unit' : 'Rooms / Units'} (Max: {availableCount})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        <button 
          disabled={checkingAvailability || availableCount === 0}
          type="submit" 
          className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all shadow-xl shadow-natural-primary/20 disabled:opacity-50 text-[10px]"
        >
          {availableCount === 0 ? 'Fully Booked for Selected Dates' : 'Add to Sanctuary Cart'}
        </button>
      </form>
    </div>
  );
};
