import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Accommodation, Hotel } from '../../types';
import { SectionLabel, Input, Modal } from './Shared';
import { Plus, Trash2, Edit2, Star, Users, MapPin, Tag, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const RoomsList = () => {
  const [rooms, setRooms] = useState<Accommodation[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Accommodation | null>(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [deleteWord, setDeleteWord] = useState('');

  const [formData, setFormData] = useState<Omit<Accommodation, 'id'>>({
    hotelId: '',
    name: '',
    type: 'Room',
    price: 0,
    rating: 5,
    maxGuests: 2,
    location: '',
    description: '',
    imageUrl: '',
    amenities: [],
    isAvailable: true
  });

  const fetchData = async () => {
    try {
      const [r, h] = await Promise.all([
        dbService.getRooms(),
        dbService.getHotels()
      ]);
      setRooms(r || []);
      setHotels(h || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await dbService.updateRoom(editingRoom.id, formData);
      } else {
        await dbService.addRoom(formData);
      }
      setIsModalOpen(false);
      setEditingRoom(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (deleteWord !== 'DELETE') return;
    try {
      await dbService.deleteRoom(deleteConfirm!.id);
      setDeleteConfirm(null);
      setDeleteWord('');
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleAvailability = async (room: Accommodation) => {
    try {
      await dbService.updateRoom(room.id, { isAvailable: !room.isAvailable });
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isAvailable: !r.isAvailable } : r));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-10 font-serif italic">Inventory loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-10 rounded-[40px] border border-natural-accent shadow-sm">
        <div>
          <h2 className="font-serif text-4xl mb-2 italic tracking-tighter">Inventory.</h2>
          <p className="text-natural-muted text-sm italic font-light">Manage accommodations, villas and suites across all portfolios.</p>
        </div>
        <button 
          onClick={() => { setEditingRoom(null); setIsModalOpen(true); }}
          className="bg-natural-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-natural-primary/20 hover:scale-110 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.map(room => {
          const hotel = hotels.find(h => h.id === room.hotelId);
          return (
            <motion.div 
              layout
              key={room.id}
              className="bg-white rounded-[40px] overflow-hidden border border-natural-accent shadow-sm group hover:shadow-2xl transition-all flex flex-col"
            >
              <div className="h-56 bg-natural-bg relative overflow-hidden">
                <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute top-6 left-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border ${
                    room.isAvailable ? 'bg-green-50/80 text-green-700 border-green-200' : 'bg-red-50/80 text-red-700 border-red-200'
                  }`}>
                    {room.isAvailable ? 'Available' : 'Booked'}
                  </span>
                </div>
                <div className="absolute bottom-6 right-6 flex gap-2">
                  <button 
                    onClick={() => { setEditingRoom(room); setFormData(room); setIsModalOpen(true); }}
                    className="p-3 bg-white/90 backdrop-blur-md text-natural-primary rounded-full hover:bg-natural-primary hover:text-white transition-all shadow-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ id: room.id, name: room.name })}
                    className="p-3 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-serif text-2xl text-natural-dark italic">{room.name}</h3>
                  <div className="flex items-center gap-1 text-natural-primary">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-bold">{room.rating}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-natural-muted uppercase tracking-widest">
                    <MapPin className="w-3 h-3" /> {hotel?.name || 'Unknown Portfolio'}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-natural-muted uppercase tracking-widest">
                    <Tag className="w-3 h-3" /> {room.type} • Up to {room.maxGuests} Guests
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-6 border-t border-natural-bg">
                  <div>
                    <span className="text-2xl font-bold font-serif italic text-natural-dark">${room.price}</span>
                    <span className="text-[10px] font-bold text-natural-muted ml-2 tracking-widest uppercase">/ night</span>
                  </div>
                  <button 
                    onClick={() => toggleAvailability(room)}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      room.isAvailable ? 'bg-natural-bg text-natural-dark hover:bg-red-50 hover:text-red-600' : 'bg-natural-primary text-white hover:bg-natural-dark'
                    }`}
                  >
                    {room.isAvailable ? 'Mark Occupied' : 'Mark Available'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <Modal title={editingRoom ? "Refine Setting" : "Establish New Unit"} onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <SectionLabel label="Select Portfolio" />
                  <select 
                    required
                    className="w-full bg-natural-bg border-none rounded-[32px] px-8 py-4 outline-none focus:ring-2 focus:ring-natural-primary/10 transition-all text-sm font-bold appearance-none"
                    value={formData.hotelId}
                    onChange={e => {
                      const h = hotels.find(h => h.id === e.target.value);
                      setFormData({...formData, hotelId: e.target.value, location: h?.location || ''})
                    }}
                  >
                    <option value="">Select a resort...</option>
                    {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div>
                  <SectionLabel label="Unit Identity" />
                  <Input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Ocean Villa 101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <SectionLabel label="Category" />
                  <select 
                    className="w-full bg-natural-bg border-none rounded-[32px] px-8 py-4 outline-none focus:ring-2 focus:ring-natural-primary/10 transition-all text-sm font-bold appearance-none"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="Villa">Villa</option>
                    <option value="Suite">Suite</option>
                    <option value="Room">Room</option>
                  </select>
                </div>
                <div>
                  <SectionLabel label="Nightly Rate ($)" />
                  <Input 
                    required
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <SectionLabel label="Max Guests" />
                  <Input 
                    required
                    type="number"
                    value={formData.maxGuests}
                    onChange={e => setFormData({...formData, maxGuests: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <SectionLabel label="Aesthetic Reference (Image URL)" />
                <div className="relative">
                  <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
                  <Input 
                    required
                    value={formData.imageUrl}
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    className="pl-14"
                    placeholder="https://unsplash.com/..."
                  />
                </div>
              </div>

              <div>
                <SectionLabel label="Sanctuary Narrative" />
                <textarea 
                  required
                  rows={3}
                  className="w-full bg-natural-bg border-none rounded-[32px] p-8 outline-none focus:ring-2 focus:ring-natural-primary/10 transition-all text-sm font-medium resize-none shadow-inner"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the ambiance and unique features of this stay..."
                />
              </div>

              <button className="w-full bg-natural-primary text-white py-6 rounded-full font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-natural-dark hover:-translate-y-1 transition-all">
                {editingRoom ? "Refine Inventory" : "Confirm Addition"}
              </button>
            </form>
          </Modal>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="fixed inset-0 bg-natural-dark/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 w-full max-w-lg bg-white rounded-[40px] p-12 shadow-2xl">
              <h3 className="font-serif text-3xl mb-4 italic text-red-600">Archival Confirmation</h3>
              <p className="text-natural-muted text-sm leading-relaxed mb-8 italic">You are removing <strong>{deleteConfirm.name}</strong> from your active inventory.</p>
              
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-natural-dark mb-3">Type "DELETE" to authorize</p>
                <Input 
                  value={deleteWord}
                  onChange={e => setDeleteWord(e.target.value)}
                  placeholder="AUTHORIZE..."
                  className="text-center font-black tracking-[0.5em] text-red-500"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-natural-bg py-4 rounded-full font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                <button 
                  disabled={deleteWord !== 'DELETE'}
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 text-white py-4 rounded-full font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
