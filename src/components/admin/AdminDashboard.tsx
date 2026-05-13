import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { supabase } from '../../lib/supabase';
import { Hotel, Accommodation, Booking, AdminProfile } from '../../types';
import { 
  Building2, 
  BedDouble, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronRight, 
  Clock,
  CheckCircle,
  XCircle,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { UsersList } from './UsersList';
import { LoadingPlane } from '../ui/LoadingPlane';
import { Modal, Input, SectionLabel } from './Shared';

type AdminTab = 'hotels' | 'rooms' | 'bookings' | 'past_bookings' | 'users';

export const AdminDashboard = ({ profile }: { profile: AdminProfile }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(profile.role === 'admin' ? 'bookings' : 'bookings');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Accommodation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingRoom, setEditingRoom] = useState<Accommodation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'hotel' | 'room', name: string } | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [h, r, b] = await Promise.all([
        dbService.getHotels(),
        dbService.getRooms(),
        dbService.getBookings()
      ]);
      setHotels(h || []);
      setRooms(r || []);
      setBookings(b || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen bg-natural-bg flex">
      <AnimatePresence>
        {loading && <LoadingPlane label="Synchronizing Dashboard" />}
      </AnimatePresence>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        bookingsCount={bookings.filter(b => b.status !== 'cancelled' && new Date(b.checkOut) >= new Date()).length}
        pastBookingsCount={bookings.filter(b => b.status === 'cancelled' || new Date(b.checkOut) < new Date()).length}
        handleLogout={handleLogout}
        isAdmin={profile.role === 'admin'}
      />

      <main className="ml-72 flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <h2 className="font-serif text-4xl italic text-natural-dark capitalize">{activeTab.replace('_', ' ')}</h2>
          <div className="flex gap-4">
            {activeTab === 'hotels' && (
              <button 
                onClick={() => { setEditingHotel(null); setShowHotelForm(true); }}
                className="bg-natural-primary text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Add Hotel
              </button>
            )}
            {activeTab === 'rooms' && (
              <button 
                onClick={() => { setEditingRoom(null); setShowRoomForm(true); }}
                className="bg-natural-primary text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Add Room
              </button>
            )}
          </div>
        </header>

        <section>
          {loading ? (
            <div className="space-y-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-24 bg-natural-accent/20 animate-pulse rounded-[32px]" />
              ))}
            </div>
          ) : (
            <>
              {(activeTab === 'bookings' || activeTab === 'past_bookings') && (
                <AdminBookingsList 
                  bookings={bookings} 
                  rooms={rooms} 
                  hotels={hotels} 
                  onUpdate={fetchData} 
                  type={activeTab === 'bookings' ? 'active' : 'past'}
                />
              )}
              {activeTab === 'hotels' && (
                <AdminHotelsList 
                  hotels={hotels} 
                  onEdit={(h: Hotel) => { setEditingHotel(h); setShowHotelForm(true); }}  
                  onDelete={(h: Hotel) => setDeleteTarget({ id: h.id, type: 'hotel', name: h.name })}
                />
              )}
              {activeTab === 'rooms' && (
                <AdminRoomsList 
                  rooms={rooms} 
                  hotels={hotels} 
                  onEdit={(r: Accommodation) => { setEditingRoom(r); setShowRoomForm(true); }} 
                  onDelete={(r: Accommodation) => setDeleteTarget({ id: r.id, type: 'room', name: r.name })}
                  onUpdate={fetchData} 
                />
              )}
              {activeTab === 'users' && profile.role === 'admin' && (
                <UsersList onUpdate={fetchData} />
              )}
            </>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showHotelForm && (
          <HotelForm 
            hotel={editingHotel} 
            onClose={() => setShowHotelForm(false)} 
            onSuccess={() => { setShowHotelForm(false); fetchData(); }} 
          />
        )}
        {showRoomForm && (
          <RoomForm 
            room={editingRoom} 
            hotels={hotels}
            onClose={() => setShowRoomForm(false)} 
            onSuccess={() => { setShowRoomForm(false); fetchData(); }} 
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal 
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={async () => {
              if (deleteTarget.type === 'hotel') {
                await dbService.deleteHotel(deleteTarget.id);
              } else {
                await dbService.deleteRoom(deleteTarget.id);
              }
              setDeleteTarget(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Embedded Components (Refactored from original Admin.tsx) ---

const AdminBookingsList = ({ bookings, rooms, hotels, onUpdate, type }: any) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredBookings = bookings.filter((b: Booking) => {
    const isPastDate = new Date(b.checkOut) < today;
    const isCancelled = b.status === 'cancelled';
    return type === 'past' ? (isCancelled || isPastDate) : (!isCancelled && !isPastDate);
  });

  const handleStatusUpdate = async (id: string, status: 'confirmed' | 'cancelled', reason?: string) => {
    const booking = selectedBooking || bookings.find((b: any) => b.id === id);
    if (!booking) return;
    try {
      const updateData: any = { status };
      if (reason) updateData.cancellationReason = reason;
      
      await dbService.updateBooking(id, updateData);
      // Removed manual room update as it's now handled by the server in the bookings patch route
      onUpdate();
      setSelectedBooking(null);
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      {filteredBookings.length === 0 && (
        <div className="bg-white p-20 rounded-[40px] text-center border-2 border-dashed border-natural-accent">
          <p className="font-serif italic text-2xl text-natural-muted">No {type} reservations found.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6">
        {filteredBookings.map((booking: Booking) => {
          const room = rooms.find((r: any) => r.id === booking.roomId);
          const hotel = hotels.find((h: any) => h.id === booking.hotelId);
          return (
            <motion.div 
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="bg-white p-8 rounded-[32px] border border-natural-accent flex items-center justify-between group cursor-pointer hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-2xl bg-natural-accent overflow-hidden">
                  <img src={room?.imageUrl || undefined} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-natural-dark">{booking.fullName}</h3>
                  <p className="text-xs text-natural-muted font-medium mt-1">{hotel?.name} — {room?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-natural-muted tracking-widest mb-1">Check In</p>
                  <p className="text-sm font-bold">{new Date(booking.checkIn).toLocaleDateString()}</p>
                </div>
                <div className="text-right min-w-[100px]">
                  <p className="text-[10px] uppercase font-bold text-natural-muted tracking-widest mb-1">Status</p>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {booking.status}
                  </span>
                </div>
                <ChevronRight className="w-6 h-6 text-natural-accent group-hover:text-natural-primary transition-colors" />
              </div>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal 
            booking={selectedBooking} 
            hotels={hotels} 
            rooms={rooms}
            onClose={() => { if (!showCancelDialog) setSelectedBooking(null); }}
            showCancelDialog={showCancelDialog}
            setShowCancelDialog={setShowCancelDialog}
            cancelReason={cancelReason}
            setCancelReason={setCancelReason}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminHotelsList = ({ hotels, onEdit, onDelete }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
    {hotels.map((hotel: Hotel) => (
      <div key={hotel.id} className="bg-white rounded-[40px] overflow-hidden border border-natural-accent hover:shadow-xl transition-all group">
        <div className="h-48 bg-natural-accent relative">
          {hotel.imageUrl && <img src={hotel.imageUrl} className="w-full h-full object-cover" />}
          <div className="absolute top-6 right-6 flex gap-2">
            <button onClick={() => onEdit(hotel)} className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-natural-dark hover:bg-white hover:text-natural-primary transition-all shadow-sm">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(hotel)} className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-center gap-2 text-natural-primary mb-3">
            <MapPin className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{hotel.location}</span>
          </div>
          <h3 className="font-serif text-2xl italic text-natural-dark mb-4">{hotel.name}</h3>
          <p className="text-xs text-natural-muted leading-relaxed line-clamp-2">{hotel.description}</p>
        </div>
      </div>
    ))}
  </div>
);

const AdminRoomsList = ({ rooms, hotels, onEdit, onDelete, onUpdate }: any) => {
  const toggleAvailability = async (room: Accommodation) => {
    await dbService.updateRoom(room.id, { isAvailable: !room.isAvailable });
    onUpdate();
  }
  return (
    <div className="bg-white rounded-[32px] overflow-hidden border border-natural-accent">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-natural-accent">
            <th className="px-8 py-6 text-[10px] uppercase font-bold text-natural-muted tracking-[0.2em]">Room Detail</th>
            <th className="px-8 py-6 text-[10px] uppercase font-bold text-natural-muted tracking-[0.2em]">Status</th>
            <th className="px-8 py-6 text-[10px] uppercase font-bold text-natural-muted tracking-[0.2em] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-natural-accent">
          {rooms.map((room: Accommodation) => (
            <tr key={room.id} className="hover:bg-natural-bg/30">
              <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                  <img src={room.imageUrl} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <p className="font-bold text-natural-dark">{room.name}</p>
                    <p className="text-[10px] text-natural-muted uppercase font-bold">{hotels.find((h: any) => h.id === room.hotelId)?.name}</p>
                  </div>
                </div>
              </td>
              <td className="px-8 py-6">
                <button onClick={() => toggleAvailability(room)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${room.isAvailable ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {room.isAvailable ? 'Available' : 'Booked'}
                </button>
              </td>
              <td className="px-8 py-6 text-right space-x-2">
                <button onClick={() => onEdit(room)} className="p-2 text-natural-muted hover:text-natural-primary transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => onDelete(room)} className="p-2 text-natural-muted hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const HotelForm = ({ hotel, onClose, onSuccess }: any) => {
  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    location: hotel?.location || '',
    description: hotel?.description || '',
    imageUrl: hotel?.imageUrl || '',
    hasBanquetHall: hotel?.hasBanquetHall || false,
    email: hotel?.email || '',
    phone: hotel?.phone || ''
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hotel) await dbService.updateHotel(hotel.id, formData);
    else await dbService.addHotel(formData);
    onSuccess();
  };
  return (
    <Modal onClose={onClose} title={hotel ? 'Edit Hotel' : 'Add Hotel'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input label="Name" value={formData.name} onChange={(v:any) => setFormData({...formData, name: v})} required />
        <Input label="Location" value={formData.location} onChange={(v:any) => setFormData({...formData, location: v})} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Contact Email" type="email" value={formData.email} onChange={(v:any) => setFormData({...formData, email: v})} />
          <Input label="Contact Phone" value={formData.phone} onChange={(v:any) => setFormData({...formData, phone: v})} />
        </div>
        <Input label="Image URL" value={formData.imageUrl} onChange={(v:any) => setFormData({...formData, imageUrl: v})} />
        
        <div className="flex items-center gap-3 p-4 bg-natural-bg rounded-2xl">
          <input 
            type="checkbox" 
            id="hasBanquetHall"
            checked={formData.hasBanquetHall} 
            onChange={e => setFormData({...formData, hasBanquetHall: e.target.checked})}
            className="w-5 h-5 accent-natural-primary"
          />
          <label htmlFor="hasBanquetHall" className="text-sm font-medium text-natural-dark">Includes Banquet Hall (for Weddings & Events)</label>
        </div>

        <textarea className="w-full bg-natural-bg rounded-2xl p-4 min-h-[120px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description" />
        <button type="submit" className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest shadow-xl">Save</button>
      </form>
    </Modal>
  );
};

const RoomForm = ({ room, hotels, onClose, onSuccess }: any) => {
  const [formData, setFormData] = useState({
    hotelId: room?.hotelId || hotels[0]?.id || '',
    name: room?.name || '',
    type: room?.type || 'Room',
    price: room?.price || 0,
    maxGuests: room?.maxGuests || 2,
    description: room?.description || '',
    imageUrl: room?.imageUrl || '',
    amenities: room?.amenities?.join(', ') || ''
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, price: Number(formData.price), maxGuests: Number(formData.maxGuests), amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean) };
    if (room) await dbService.updateRoom(room.id, payload);
    else await dbService.addRoom(payload);
    onSuccess();
  };
  return (
    <Modal onClose={onClose} title={room ? 'Edit Room' : 'Add Room'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <select className="w-full bg-natural-bg rounded-2xl p-4" value={formData.hotelId} onChange={e => setFormData({...formData, hotelId: e.target.value})}>
          {hotels.map((h: Hotel) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <Input label="Name" value={formData.name} onChange={(v:any) => setFormData({...formData, name: v})} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Price" type="number" value={formData.price} onChange={(v:any) => setFormData({...formData, price: v})} required />
          <Input label="Capacity" type="number" value={formData.maxGuests} onChange={(v:any) => setFormData({...formData, maxGuests: v})} required />
        </div>
        <Input label="Image URL" value={formData.imageUrl} onChange={(v:any) => setFormData({...formData, imageUrl: v})} />
        <button type="submit" className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest shadow-xl">Save</button>
      </form>
    </Modal>
  );
};

// --- Missing subcomponents from original refactor ---

const BookingDetailsModal = ({ booking, hotels, rooms, onClose, showCancelDialog, setShowCancelDialog, cancelReason, setCancelReason, onStatusUpdate }: any) => {
  const hotel = hotels.find((h: any) => h.id === booking.hotelId);
  const room = rooms.find((r: any) => r.id === booking.roomId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-natural-dark/40 backdrop-blur-sm" onClick={onClose} />
      {!showCancelDialog ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-3xl bg-white rounded-[40px] p-12 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-8 border-b border-natural-accent pb-6">
            <div>
              <h3 className="font-serif text-3xl italic text-natural-dark">Reservation Details</h3>
              <div className="flex gap-4 mt-1">
                <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest">ID: {booking.id}</p>
                <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest border-l border-natural-accent pl-4">Placed: {new Date(booking.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-natural-bg rounded-full transition-colors"><XCircle className="w-8 h-8 text-natural-muted" /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
            <div className="space-y-8">
              <div>
                <SectionLabel label="Guest Information" />
                <div className="bg-natural-bg p-6 rounded-3xl space-y-3 mt-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-natural-muted tracking-widest">Full Name</p>
                    <p className="font-bold text-natural-dark">{booking.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-natural-muted tracking-widest">Email Address</p>
                    <p className="font-medium text-natural-dark">{booking.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-natural-muted tracking-widest">Phone Number</p>
                    <p className="font-medium text-natural-dark">{booking.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div>
                <SectionLabel label="Stay Schedule" />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-natural-bg p-6 rounded-3xl">
                    <p className="text-[10px] uppercase font-bold text-natural-muted tracking-widest mb-1">Check In</p>
                    <p className="font-bold text-natural-dark">{new Date(booking.checkIn).toLocaleDateString()}</p>
                    <p className="text-[10px] font-bold text-natural-primary mt-1">2:00 PM</p>
                  </div>
                  <div className="bg-natural-bg p-6 rounded-3xl">
                    <p className="text-[10px] uppercase font-bold text-natural-muted tracking-widest mb-1">Check Out</p>
                    <p className="font-bold text-natural-dark">{new Date(booking.checkOut).toLocaleDateString()}</p>
                    <p className="text-[10px] font-bold text-natural-primary mt-1">11:00 AM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <SectionLabel label="Property & Room" />
                <div className="bg-natural-bg p-6 rounded-3xl mt-4">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shadow-sm">
                       <img src={room?.imageUrl} className="w-full h-full object-cover" />
                     </div>
                     <div>
                       <p className="font-bold text-natural-dark text-sm">{hotel?.name}</p>
                       <p className="text-xs text-natural-muted">{room?.name}</p>
                     </div>
                   </div>
                   <div className="flex justify-between items-center pt-4 border-t border-natural-accent/50">
                     <span className="text-[10px] uppercase font-bold text-natural-muted tracking-widest">Guests</span>
                     <span className="font-bold text-natural-dark">{booking.guests} People</span>
                   </div>
                </div>
              </div>

              <div>
                <SectionLabel label="Special Requests" />
                <div className="bg-natural-accent/30 p-6 rounded-3xl mt-4 min-h-[100px]">
                  <p className="text-xs text-natural-muted leading-relaxed italic">
                    {booking.specialRequests || "No special requests were noted for this reservation."}
                  </p>
                </div>
              </div>

              {booking.cancellationReason && (
                <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                  <SectionLabel label="Cancellation Reason" />
                  <p className="text-xs text-red-600 mt-2 italic">{booking.cancellationReason}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-8 border-t border-natural-accent">
            {booking.status === 'pending' && (
              <button 
                onClick={() => onStatusUpdate(booking.id, 'confirmed')} 
                className="flex-1 bg-green-600 text-white py-5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-green-700 transition-all shadow-lg"
              >
                Confirm Reservation
              </button>
            )}
            {booking.status !== 'cancelled' && (
              <button 
                onClick={() => setShowCancelDialog(true)} 
                className="flex-1 bg-white border border-red-200 text-red-600 py-5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all"
              >
                Cancel Booking
              </button>
            )}
            {booking.status === 'cancelled' && (
              <div className="w-full text-center py-4 bg-red-50 text-red-600 rounded-full font-bold uppercase text-[10px] tracking-widest">
                This Reservation is Cancelled
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl">
          <h4 className="font-serif text-2xl italic text-natural-dark mb-6">Cancellation Reason</h4>
          <textarea className="w-full bg-natural-bg rounded-2xl p-4 min-h-[120px] mb-8 outline-none focus:ring-2 focus:ring-red-500/20" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Please state why this booking is being cancelled..." />
          <div className="flex gap-4">
            <button onClick={() => setShowCancelDialog(false)} className="flex-1 py-4 uppercase font-bold text-[10px] tracking-widest text-natural-muted">Back</button>
            <button onClick={() => onStatusUpdate(booking.id, 'cancelled', cancelReason)} className="flex-1 bg-red-600 text-white py-4 rounded-full uppercase font-bold text-[10px] tracking-widest shadow-lg">Confirm Cancellation</button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const DeleteConfirmModal = ({ target, onClose, onConfirm }: any) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <Modal onClose={onClose} title="Confirm Deletion">
      <div className="space-y-6">
        <div className="bg-red-50 p-6 rounded-2xl text-red-600 text-sm italic">Warning: Permanent deletion of {target.name}.</div>
        <Input label="Type 'DELETE' to confirm" value={text} onChange={setText} />
        <button disabled={text !== 'DELETE' || loading} onClick={onConfirm} className="w-full bg-red-600 text-white py-5 rounded-full font-bold uppercase tracking-widest disabled:opacity-50">{loading ? 'Deleting...' : 'Delete'}</button>
      </div>
    </Modal>
  );
};
