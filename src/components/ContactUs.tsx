import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, MessageSquare, Building2 } from 'lucide-react';
import { SectionLabel, Input } from './admin/Shared';
import { dbService } from '../services/db';
import { Hotel } from '../types';

export const ContactUs = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    dbService.getHotels().then(setHotels).catch(console.error);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // In a real app, send to API
  };

  return (
    <div className="min-h-screen bg-natural-bg pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-10">
        <div className="text-center mb-20 space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-natural-primary">Connect With Us</span>
          <h1 className="font-serif text-5xl italic text-natural-dark">We're Here for You</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-32">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 space-y-12"
          >
            <div className="space-y-8">
              <div className="flex gap-6 items-start group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-natural-primary transition-all">
                  <Mail className="w-6 h-6 text-natural-primary group-hover:text-white" />
                </div>
                <div>
                  <SectionLabel label="Email Inquiries" />
                  <p className="font-bold text-natural-dark mt-1">reservations@ahsellresorts.com</p>
                  <p className="text-xs text-natural-muted mt-1">Response time: within 2 hours</p>
                </div>
              </div>

              <div className="flex gap-6 items-start group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-natural-primary transition-all">
                  <Phone className="w-6 h-6 text-natural-primary group-hover:text-white" />
                </div>
                <div>
                  <SectionLabel label="Phone Support" />
                  <p className="font-bold text-natural-dark mt-1">+94 11 234 5678</p>
                  <p className="text-xs text-natural-muted mt-1">Available 24/7</p>
                </div>
              </div>

              <div className="flex gap-6 items-start group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-natural-primary transition-all">
                  <MapPin className="w-6 h-6 text-natural-primary group-hover:text-white" />
                </div>
                <div>
                  <SectionLabel label="Headquarters" />
                  <p className="font-bold text-natural-dark mt-1">Heritage Ahungalla Resort</p>
                  <p className="text-xs text-natural-muted mt-1">Galle Road, Ahungalla, Sri Lanka</p>
                </div>
              </div>
            </div>

            <div className="bg-natural-primary/5 p-10 rounded-[40px] border border-natural-primary/10">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-5 h-5 text-natural-primary" />
                <h3 className="font-serif italic text-xl text-natural-dark">Chat with us</h3>
              </div>
              <p className="text-sm text-natural-muted leading-relaxed mb-6">
                Prefer instant messaging? Our concierge team is available via WhatsApp for immediate assistants with your holiday planning.
              </p>
              <button className="bg-white text-natural-dark border border-natural-accent py-4 px-8 rounded-full font-bold uppercase text-[9px] tracking-widest hover:bg-natural-primary hover:text-white hover:border-natural-primary transition-all">
                Launch WhatsApp
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7"
          >
            <div className="bg-white p-12 rounded-[48px] shadow-xl border border-natural-accent">
              {submitted ? (
                <div className="py-20 text-center space-y-6">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                    <Send className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-serif text-3xl italic text-natural-dark">Message Dispatched</h3>
                  <p className="text-natural-muted max-w-sm mx-auto">
                    Thank you for reaching out. A dedicated member of our concierge team will be in touch with you shortly.
                  </p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="text-[10px] font-bold uppercase tracking-widest text-natural-primary border-b border-natural-primary pb-1"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input label="Your Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                    <Input label="Email Address" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} required />
                  </div>
                  <Input label="Subject" value={formData.subject} onChange={v => setFormData({...formData, subject: v})} required />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">How can we help?</label>
                    <textarea 
                      className="w-full bg-natural-bg rounded-[32px] p-6 min-h-[160px] outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-sm"
                      placeholder="Share your requirements or questions here..."
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-natural-primary text-white py-6 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all shadow-xl shadow-natural-primary/10 flex items-center justify-center gap-3"
                  >
                    Submit Inquiry <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>

        {hotels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="flex items-end justify-between border-b border-natural-accent pb-8">
              <h2 className="font-serif text-3xl italic text-natural-dark">Resort Contacts</h2>
              <p className="text-[10px] text-natural-muted uppercase font-bold tracking-widest">Connect Directly</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="bg-white p-8 rounded-[32px] border border-natural-accent hover:border-natural-primary transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-4 h-4 text-natural-primary" />
                    <h3 className="font-serif text-xl italic text-natural-dark">{hotel.name}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-natural-muted">
                      <Mail className="w-3 h-3" />
                      <span>{hotel.email || 'concierge@heritage.com'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-natural-muted">
                      <Phone className="w-3 h-3" />
                      <span>{hotel.phone || '+94 11 234 5678'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
