import React, { useState, useEffect, useRef } from 'react';
import { BookUser, Search, BedDouble, CalendarDays, Users, X, ChevronLeft, ChevronRight, Building2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Hotel } from '../../types';

interface GuestSummary {
  email: string;
  fullName: string;
  phone?: string;
  totalBookings: number;
  confirmedBookings: number;
  totalNights: number;
  firstSeen: string;
  lastCheckIn?: string;
  inHouseNow: boolean;
  hotels: string[];
}

interface GuestBooking {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  roomName: string;
  hotelName: string;
  guests: number;
  roomCount: number;
  specialRequests?: string;
  createdAt: string;
}

interface GuestDirectoryProps {
  hotels: Hotel[];
  onError: (msg: string) => void;
}

const PAGE_SIZE = 20;

const nights = (ci: string, co: string) =>
  Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000));

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtShort = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  confirmed:      { label: 'Confirmed',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle className="w-3 h-3" /> },
  pending:        { label: 'Pending',        cls: 'bg-amber-50 text-amber-700 border-amber-100',       icon: <Clock className="w-3 h-3" /> },
  payment_review: { label: 'Payment Review', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100',    icon: <AlertCircle className="w-3 h-3" /> },
  cancelled:      { label: 'Cancelled',      cls: 'bg-red-50 text-red-400 border-red-100',             icon: <XCircle className="w-3 h-3" /> },
};

const token = () => localStorage.getItem('resort_customer_token') ?? '';

// ── Guest card ─────────────────────────────────────────────────────────────────
const GuestCard = ({ guest, onClick }: { guest: GuestSummary; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-5 bg-white border border-natural-accent rounded-2xl hover:shadow-md hover:border-natural-primary/30 transition-all group"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-natural-dark text-sm group-hover:text-natural-primary transition-colors truncate">
            {guest.fullName}
          </p>
          {guest.inHouseNow && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              In-House
            </span>
          )}
        </div>
        <p className="text-[11px] text-natural-muted font-mono mt-0.5 truncate">{guest.email}</p>
        {guest.phone && (
          <p className="text-[11px] text-natural-muted mt-0.5">{guest.phone}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-natural-muted group-hover:text-natural-primary transition-colors shrink-0 mt-0.5" />
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-natural-muted">
      <span className="flex items-center gap-1">
        <BedDouble className="w-3.5 h-3.5 shrink-0" />
        <span className="font-bold text-natural-dark">{guest.confirmedBookings}</span> stay{guest.confirmedBookings !== 1 ? 's' : ''}
      </span>
      <span className="flex items-center gap-1">
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span className="font-bold text-natural-dark">{guest.totalNights}</span> night{guest.totalNights !== 1 ? 's' : ''}
      </span>
      {guest.lastCheckIn && (
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Last: {fmtDate(guest.lastCheckIn)}
        </span>
      )}
      {guest.hotels && guest.hotels.length > 0 && (
        <span className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          {guest.hotels.join(', ')}
        </span>
      )}
    </div>
  </button>
);

// ── Booking history row ────────────────────────────────────────────────────────
const BookingHistoryRow = ({ b }: { b: GuestBooking }) => {
  const cfg = STATUS_CONFIG[b.status] || { label: b.status, cls: 'bg-gray-50 text-gray-500 border-gray-100', icon: null };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-natural-bg border border-natural-accent">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-natural-dark text-xs">{b.roomName}</p>
          <span className="text-[9px] text-natural-muted">{b.hotelName}</span>
        </div>
        {b.specialRequests && (
          <p className="text-[10px] text-natural-muted mt-1 truncate italic">"{b.specialRequests}"</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] shrink-0">
        <span className="flex items-center gap-1 text-natural-muted">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span className="font-medium">{fmtShort(b.checkIn)} → {fmtShort(b.checkOut)}</span>
          <span className="text-[10px]">({nights(b.checkIn, b.checkOut)}n)</span>
        </span>
        <span className="flex items-center gap-1 text-natural-muted">
          <Users className="w-3 h-3 shrink-0" />
          {b.guests}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${cfg.cls}`}>
          {cfg.icon}{cfg.label}
        </span>
      </div>
    </div>
  );
};

// ── Guest detail modal ─────────────────────────────────────────────────────────
const GuestModal = ({ guest, onClose }: { guest: GuestSummary; onClose: () => void }) => {
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/guests/${encodeURIComponent(guest.email)}/bookings`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (!res.ok) throw new Error('Failed to load booking history.');
        setBookings(await res.json());
      } catch {
        // silently ignore — list stays empty
      } finally {
        setLoading(false);
      }
    })();
  }, [guest.email]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-7 border-b border-natural-accent">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-xl italic text-natural-dark">{guest.fullName}</h2>
              {guest.inHouseNow && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  In-House Now
                </span>
              )}
            </div>
            <p className="text-[11px] text-natural-muted font-mono mt-1">{guest.email}</p>
            {guest.phone && <p className="text-[11px] text-natural-muted">{guest.phone}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-natural-accent text-natural-muted transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex gap-6 px-7 py-4 bg-natural-bg border-b border-natural-accent text-[11px] text-natural-muted flex-wrap">
          <span><span className="font-bold text-natural-dark">{guest.confirmedBookings}</span> confirmed stay{guest.confirmedBookings !== 1 ? 's' : ''}</span>
          <span><span className="font-bold text-natural-dark">{guest.totalNights}</span> total night{guest.totalNights !== 1 ? 's' : ''}</span>
          <span>First seen: <span className="font-bold text-natural-dark">{fmtDate(guest.firstSeen)}</span></span>
          {guest.hotels?.length > 0 && (
            <span>Properties: <span className="font-bold text-natural-dark">{guest.hotels.join(', ')}</span></span>
          )}
        </div>

        {/* Booking list */}
        <div className="flex-1 overflow-y-auto p-7">
          <p className="text-[10px] uppercase font-bold tracking-widest text-natural-muted mb-4">
            Booking History ({bookings.length})
          </p>
          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-[3px] border-natural-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-xs text-natural-muted italic text-center py-10">No bookings found.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => <BookingHistoryRow key={b.id} b={b} />)}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const GuestDirectory = ({ hotels, onError }: GuestDirectoryProps) => {
  const [guests, setGuests]         = useState<GuestSummary[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [hotelFilter, setHotelFilter] = useState('all');
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<GuestSummary | null>(null);
  const debounce                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pages = Math.ceil(total / PAGE_SIZE);

  const load = async (p: number, s: string, h: string) => {
    setLoading(true);
    try {
      const qp = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (s) qp.set('search', s);
      if (h && h !== 'all') qp.set('hotelId', h);
      const res = await fetch(`/api/admin/guests?${qp}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Failed to load guests.');
      const data = await res.json();
      setGuests(data.items);
      setTotal(data.total);
    } catch (err: any) {
      onError(err.message || 'Failed to load guests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(page, search, hotelFilter), search ? 350 : 0);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search, hotelFilter, page]);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleHotel  = (val: string) => { setHotelFilter(val); setPage(1); };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <BookUser className="w-5 h-5 text-natural-primary" />
            <h2 className="font-serif text-2xl italic text-natural-dark">Guest Directory</h2>
          </div>
          {!loading && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-natural-muted">
              {total.toLocaleString()} guest{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-natural-accent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark"
            />
          </div>
          {hotels.length > 1 && (
            <select
              value={hotelFilter}
              onChange={e => handleHotel(e.target.value)}
              className="bg-white border border-natural-accent rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark appearance-none cursor-pointer"
            >
              <option value="all">All Properties</option>
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-natural-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-natural-muted animate-pulse">
              Loading guests…
            </span>
          </div>
        ) : guests.length === 0 ? (
          <div className="py-20 bg-white border border-natural-accent rounded-3xl flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
              <BookUser className="w-8 h-8 text-natural-muted" />
            </div>
            <div>
              <p className="font-serif italic text-lg text-natural-dark">No guests found</p>
              <p className="text-xs text-natural-muted mt-1">
                {search ? 'Try a different search term.' : 'Guests appear here once the first booking is made.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {guests.map(g => (
              <GuestCard key={g.email} guest={g} onClick={() => setSelected(g)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2.5 rounded-full border border-natural-accent text-natural-muted hover:bg-natural-accent disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-natural-muted uppercase tracking-widest">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-2.5 rounded-full border border-natural-accent text-natural-muted hover:bg-natural-accent disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Guest detail modal */}
      <AnimatePresence>
        {selected && (
          <GuestModal guest={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
};
