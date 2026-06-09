import React, { useState } from 'react';
import { X, Trash2, Heart, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '../types';
import { dbService } from '../services/db';
import { PhoneInputField } from './PhoneInputField';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  user: any;
  onOpenAuth: () => void;
  onSuccess: () => void;
}

export const CartDrawer = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onClearCart,
  user,
  onOpenAuth,
  onSuccess
}: CartDrawerProps) => {
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    specialRequests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-sync logged-in user details if they authenticate while the cart is open
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        fullName: '',
        email: '',
        phone: ''
      }));
    }
  }, [user]);

  const calculateNights = (inDate: string, outDate: string) => {
    const d1 = new Date(inDate);
    const d2 = new Date(outDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 1 : diffDays;
  };

  const getSubtotal = (item: CartItem) => {
    const nights = calculateNights(item.checkIn, item.checkOut);
    return item.accommodation.price * nights * item.roomCount;
  };

  const grandTotal = cart.reduce((total, item) => total + getSubtotal(item), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Synchronize user profile first to guarantee foreign key constraint safety
      await dbService.saveCustomerProfile(user.id, {
        email: user.email || formData.email,
        displayName: user.user_metadata?.full_name || formData.fullName,
        phone: formData.phone || user.user_metadata?.phone || undefined,
        photoURL: user.user_metadata?.avatar_url || null,
        createdAt: new Date().toISOString()
      });

      // 2. Add Booking for each sanctuary item in the cart
      for (const item of cart) {
        const checkInDate = new Date(item.checkIn);
        checkInDate.setHours(14, 0, 0, 0); // Standard check-in

        const checkOutDate = new Date(item.checkOut);
        checkOutDate.setHours(11, 0, 0, 0); // Standard check-out

        await dbService.addBooking({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          specialRequests: formData.specialRequests,
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
          roomId: item.accommodation.id,
          hotelId: item.accommodation.hotelId,
          userId: user.id,
          status: 'pending',
          guests: item.guests || 2,
          roomCount: item.roomCount,
          createdAt: new Date().toISOString()
        });
      }

      onClearCart();
      onSuccess();
    } catch (err: any) {
      console.error('Checkout failed:', err);
      alert('Failed to place booking: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-natural-dark z-[110] backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-natural-cream shadow-2xl z-[120] flex flex-col border-l border-natural-accent overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-8 border-b border-natural-accent flex justify-between items-center bg-natural-cream">
              <div>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-natural-dark italic">Sanctuary Cart</h3>
                <p className="text-[10px] uppercase tracking-widest text-natural-muted font-mono mt-1">Your Selected Journeys</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-natural-bg rounded-full transition-colors border border-natural-accent bg-white">
                <X className="w-5 h-5 text-natural-dark" />
              </button>
            </div>

              {/* Core Cart Items Container */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-natural-cream selection:bg-natural-primary/5">
                    <Heart className="w-10 h-10 text-natural-accent mb-4 animate-pulse" />
                    <p className="text-sm text-natural-muted italic font-light">No micro-escapes select yet.</p>
                    <button 
                      onClick={onClose}
                      className="mt-6 text-[10px] font-bold uppercase tracking-widest text-natural-primary border-b border-natural-primary pb-1 hover:opacity-60"
                    >
                      Browse Accommodations
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {cart.map((item) => {
                        const nights = calculateNights(item.checkIn, item.checkOut);
                        const subTotal = getSubtotal(item);
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-5 rounded-3xl border border-natural-accent shadow-sm hover:shadow-md transition-all flex gap-4"
                          >
                            <img 
                              src={item.accommodation.imageUrl || undefined} 
                              alt={item.accommodation.name} 
                              className="w-16 h-16 rounded-2xl object-cover border border-natural-accent bg-natural-bg" 
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold font-serif text-natural-dark truncate">{item.accommodation.name}</h5>
                              <p className="text-[9px] uppercase tracking-wider text-natural-muted font-mono mt-0.5">{item.accommodation.location}</p>
                              
                              <div className="mt-3 text-[10px] text-natural-dark font-medium space-y-0.5 font-sans">
                                <div>
                                  <span className="text-natural-muted">Stay:</span> {formatDate(item.checkIn)} - {formatDate(item.checkOut)}
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>
                                    <span className="text-natural-muted">{item.roomCount} unit(s) x {nights} night(s):</span>
                                  </span>
                                  <span className="font-bold text-natural-primary">
                                    ${subTotal}
                                  </span>
                                </div>
                                <div className="text-[9px] text-natural-muted font-light italic mt-1">
                                  Price per night per unit: ${item.accommodation.price}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="self-start p-2 text-natural-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Guest Booking Details Form */}
                    <div className="pt-6 border-t border-natural-accent">
                      <h4 className="text-[11px] uppercase font-bold tracking-widest text-natural-dark mb-4 font-mono">Lead Guest Details</h4>
                      
                      {!user ? (
                        <div className="bg-natural-accent/20 p-6 rounded-3xl text-center space-y-4 border border-natural-accent/35">
                          <p className="text-xs text-natural-muted font-medium italic">Please log in to finalize your escrow reservation.</p>
                          <button
                            type="button"
                            onClick={onOpenAuth}
                            className="w-full bg-natural-primary text-white py-4 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-natural-dark transition-all shadow"
                          >
                            Sign In or Join
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleCheckout} className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-widest text-natural-muted ml-3 mb-1">Full Name</label>
                            <input
                              required
                              type="text"
                              value={formData.fullName}
                              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                              placeholder="Lead guest name"
                              className="w-full bg-white border border-natural-accent rounded-full px-5 py-3 text-xs outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-widest text-natural-muted ml-3 mb-1">Email</label>
                              <input
                                required
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="name@example.com"
                                className="w-full bg-white border border-natural-accent rounded-full px-5 py-3 text-xs outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-widest text-natural-muted ml-3 mb-1 font-mono">Phone</label>
                              <PhoneInputField
                                id="cart-drawer-phone-input"
                                required
                                value={formData.phone}
                                onChange={val => setFormData({ ...formData, phone: val })}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-widest text-natural-muted ml-3 mb-1">Concierge Requests (Optional)</label>
                            <textarea
                              rows={2}
                              value={formData.specialRequests}
                              onChange={e => setFormData({ ...formData, specialRequests: e.target.value })}
                              placeholder="Any dietary needs, bed setups, early arrival requests..."
                              className="w-full bg-white border border-natural-accent rounded-2xl px-5 py-3 text-xs outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium resize-none"
                            />
                          </div>

                          <div className="pt-6 border-t border-natural-accent">
                            <div className="flex justify-between items-baseline mb-6">
                              <span className="text-xs font-bold text-natural-muted uppercase font-mono tracking-widest">Selected Esoteric Escapes:</span>
                              <span className="text-2xl font-serif font-bold text-natural-dark">${grandTotal}</span>
                            </div>

                            <button
                              disabled={isSubmitting}
                              type="submit"
                              className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-natural-dark disabled:opacity-50 text-[10px]"
                            >
                              {isSubmitting ? 'Requesting Escapes...' : 'Confirm Cart Escapes'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </>
                )}
              </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
