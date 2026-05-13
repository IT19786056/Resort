import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Hotel } from '../../types';
import { SectionLabel, Input, Modal } from './Shared';
import { Plus, Trash2, Edit2, MapPin, ImageIcon, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HotelsList = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [deleteWord, setDeleteWord] = useState('');

  const [formData, setFormData] = useState<Omit<Hotel, 'id'>>({
    name: '',
    location: '',
    description: '',
    imageUrl: '',
    images: []
  });

  const fetchHotels = async () => {
    try {
      const h = await dbService.getHotels();
      setHotels(h || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        await dbService.updateHotel(editingHotel.id, formData);
      } else {
        await dbService.addHotel(formData);
      }
      setIsModalOpen(false);
      setEditingHotel(null);
      setFormData({ name: '', location: '', description: '', imageUrl: '', images: [] });
      fetchHotels();
    } catch (error) {
      console.error(error);
      alert('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (deleteWord !== 'DELETE') return;
    try {
      await dbService.deleteHotel(deleteConfirm!.id);
      setDeleteConfirm(null);
      setDeleteWord('');
      fetchHotels();
    } catch (error) {
      console.error(error);
      alert('Delete failed');
    }
  };

  if (loading) return <div className="p-10 font-serif italic">Loading hotels...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-10 rounded-[40px] border border-natural-accent shadow-sm">
        <div>
          <h2 className="font-serif text-4xl mb-2 italic tracking-tighter">The Portfolios</h2>
          <p className="text-natural-muted text-sm italic font-light">Manage your resort collection properties.</p>
        </div>
        <button 
          onClick={() => { setEditingHotel(null); setIsModalOpen(true); }}
          className="bg-natural-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-natural-primary/20 hover:scale-110 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {hotels.map(hotel => (
          <motion.div 
            layout
            key={hotel.id}
            className="bg-white rounded-[40px] overflow-hidden border border-natural-accent shadow-sm group hover:shadow-2xl transition-all"
          >
            <div className="h-64 bg-natural-bg relative overflow-hidden">
              <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute top-6 right-6 flex gap-2">
                <button 
                  onClick={() => { setEditingHotel(hotel); setFormData(hotel); setIsModalOpen(true); }}
                  className="p-3 bg-white/90 backdrop-blur-md text-natural-primary rounded-full hover:bg-natural-primary hover:text-white transition-all shadow-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDeleteConfirm({ id: hotel.id, name: hotel.name })}
                  className="p-3 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-10">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-natural-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-natural-muted">{hotel.location}</span>
              </div>
              <h3 className="font-serif text-3xl text-natural-dark mb-4 italic group-hover:text-natural-primary transition-colors">{hotel.name}</h3>
              <p className="text-sm text-natural-muted leading-relaxed font-light line-clamp-2 italic">{hotel.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <Modal title={editingHotel ? "Refine Resort" : "Establish New Resort"} onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <SectionLabel label="Property Name" />
                  <Input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Heritage Ahungalla"
                  />
                </div>
                <div>
                  <SectionLabel label="Location Context" />
                  <Input 
                    required
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    placeholder="Ahungalla, Sri Lanka"
                  />
                </div>
              </div>

              <div>
                <SectionLabel label="Portfolio Image URL" />
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
                <SectionLabel label="Resort Narrative" />
                <div className="relative">
                  <FileText className="absolute left-6 top-6 w-4 h-4 text-natural-muted" />
                  <textarea 
                    required
                    rows={4}
                    className="w-full bg-natural-bg border-none rounded-[32px] p-8 pl-14 outline-none focus:ring-2 focus:ring-natural-primary/10 transition-all text-sm font-medium resize-none shadow-inner"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Share the story and essence of this property..."
                  />
                </div>
              </div>

              <button className="w-full bg-natural-primary text-white py-6 rounded-full font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-natural-dark hover:-translate-y-1 transition-all">
                {editingHotel ? "Update Portfolio" : "Confirm Addition"}
              </button>
            </form>
          </Modal>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="fixed inset-0 bg-natural-dark/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 w-full max-w-lg bg-white rounded-[40px] p-12 shadow-2xl">
              <h3 className="font-serif text-3xl mb-4 italic text-red-600">Irreversible Action</h3>
              <p className="text-natural-muted text-sm leading-relaxed mb-8 italic">You are about to remove <strong>{deleteConfirm.name}</strong> from your collection. This will also potentially archive all associated rooms.</p>
              
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-natural-dark mb-3">Type "DELETE" to authorize</p>
                <Input 
                  value={deleteWord}
                  onChange={e => setDeleteWord(e.target.value)}
                  placeholder="AUTHORIZE..."
                  className="text-center font-black tracking-[0.5em] text-red-500 placeholder:opacity-30"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-natural-bg py-4 rounded-full font-bold uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button 
                  disabled={deleteWord !== 'DELETE'}
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 text-white py-4 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20 disabled:opacity-50"
                >
                  Authorize Removal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
