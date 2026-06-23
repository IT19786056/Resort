import React, { useState, useEffect } from 'react';
import { Sun, LogIn, LogOut, BedDouble, AlertCircle, RefreshCw, Users, CalendarDays, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface TodayEntry {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomCount: number;
  status: string;
  specialRequests?: string;
  roomName: string;
  hotelName: string;
  createdAt: string;
}

interface TodayData {
  date: string;
  arrivals: TodayEntry[];
  departures: TodayEntry[];
  inHouse: TodayEntry[];
  pendingActions: TodayEntry[];
}

interface TodayDashboardProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

const nights = (ci: string, co: string) =>
  Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000));

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const fmtDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const STATUS_BADGE: Record<string, string> = {
  pending:        'bg-amber-50 text-amber-700 border-amber-100',
  payment_review: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

const STATUS_LABEL: Record<string, string> = {
  pending:        'Pending',
  payment_review: 'Payment Review',
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  icon, label, count, color,
}: {
  icon: React.ReactNode; label: string; count: number; color: string;
}) => (
  <div className={`flex items-center gap-4 p-5 rounded-2xl border ${color}`}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold leading-none">{count}</p>
      <p className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-70">{label}</p>
    </div>
  </div>
);

// ── Booking row (compact card) ─────────────────────────────────────────────────
const BookingRow = ({ entry, accent }: { entry: TodayEntry; accent?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-natural-accent hover:shadow-sm transition-all">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-bold text-natural-dark text-sm truncate">{entry.fullName}</p>
        {entry.status !== 'confirmed' && (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_BADGE[entry.status] || ''}`}>
            {STATUS_LABEL[entry.status] || entry.status}
          </span>
        )}
      </div>
      <p className="text-[10px] text-natural-muted font-mono mt-0.5 truncate">{entry.email}</p>
    </div>

    <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
      <span className="text-natural-muted flex items-center gap-1">
        <BedDouble className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">{entry.roomName}</span>
        {entry.roomCount > 1 && <span className="text-[10px]">×{entry.roomCount}</span>}
      </span>
      <span className={`text-natural-muted flex items-center gap-1 ${accent || ''}`}>
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">{fmtDate(entry.checkIn)} → {fmtDate(entry.checkOut)}</span>
        <span className="text-[10px] text-natural-muted">({nights(entry.checkIn, entry.checkOut)}n)</span>
      </span>
      <span className="text-natural-muted flex items-center gap-1">
        <Users className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">{entry.guests}</span>
      </span>
    </div>
  </div>
);

// ── Section ───────────────────────────────────────────────────────────────────
const Section = ({
  icon, title, entries, emptyMsg, accentCls,
}: {
  icon: React.ReactNode;
  title: string;
  entries: TodayEntry[];
  emptyMsg: string;
  accentCls?: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="font-bold text-[11px] uppercase tracking-widest text-natural-muted">{title}</h3>
      <span className="ml-auto text-[10px] font-bold text-natural-muted bg-natural-accent px-2 py-0.5 rounded-full">
        {entries.length}
      </span>
    </div>
    {entries.length === 0 ? (
      <p className="text-xs text-natural-muted italic px-1">{emptyMsg}</p>
    ) : (
      <div className="space-y-2">
        {entries.map(e => (
          <BookingRow key={e.id} entry={e} accent={accentCls} />
        ))}
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const TodayDashboard = ({ onError }: TodayDashboardProps) => {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('resort_customer_token');
      const res = await fetch('/api/admin/today', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) throw new Error('Failed to load today\'s data.');
      setData(await res.json());
    } catch (err: any) {
      onError(err.message || 'Failed to load today\'s data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-natural-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-natural-muted animate-pulse">
          Loading today's overview…
        </span>
      </div>
    );
  }

  if (!data) return null;

  const totalConfirmed = data.arrivals.length + data.departures.length + data.inHouse.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-5 h-5 text-amber-500" />
            <h2 className="font-serif text-2xl italic text-natural-dark">Today</h2>
          </div>
          <p className="text-xs text-natural-muted font-medium">{fmtDay(data.date)}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 text-natural-muted hover:text-natural-dark hover:bg-natural-accent rounded-full transition-all font-bold uppercase text-[10px] tracking-widest border border-natural-accent"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<LogIn className="w-5 h-5 text-emerald-600" />}
          label="Arriving Today"
          count={data.arrivals.length}
          color="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
        <StatCard
          icon={<LogOut className="w-5 h-5 text-amber-600" />}
          label="Departing Today"
          count={data.departures.length}
          color="bg-amber-50 border-amber-100 text-amber-900"
        />
        <StatCard
          icon={<BedDouble className="w-5 h-5 text-blue-600" />}
          label="In-House"
          count={data.inHouse.length}
          color="bg-blue-50 border-blue-100 text-blue-900"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          label="Needs Attention"
          count={data.pendingActions.length}
          color={data.pendingActions.length > 0
            ? 'bg-red-50 border-red-100 text-red-900'
            : 'bg-natural-bg border-natural-accent text-natural-dark'}
        />
      </div>

      {totalConfirmed === 0 && data.pendingActions.length === 0 ? (
        <div className="p-16 bg-white border border-natural-accent rounded-3xl flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
            <Sun className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h4 className="font-serif italic text-lg text-neutral-800 font-bold">All Clear</h4>
            <p className="text-xs text-natural-muted max-w-sm mt-1 leading-relaxed">
              No arrivals, departures, or pending actions for today.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Arrivals */}
          <Section
            icon={<LogIn className="w-4 h-4 text-emerald-600" />}
            title="Checking In Today"
            entries={data.arrivals}
            emptyMsg="No arrivals scheduled for today."
            accentCls="text-emerald-700"
          />

          {/* Departures */}
          <Section
            icon={<LogOut className="w-4 h-4 text-amber-600" />}
            title="Checking Out Today"
            entries={data.departures}
            emptyMsg="No departures scheduled for today."
            accentCls="text-amber-700"
          />

          {/* In-house */}
          {data.inHouse.length > 0 && (
            <Section
              icon={<BedDouble className="w-4 h-4 text-blue-600" />}
              title="Currently In-House"
              entries={data.inHouse}
              emptyMsg="No guests currently staying over."
              accentCls="text-blue-700"
            />
          )}

          {/* Pending actions */}
          {data.pendingActions.length > 0 && (
            <Section
              icon={<AlertCircle className="w-4 h-4 text-red-500" />}
              title="Needs Attention — Pending Bookings"
              entries={data.pendingActions}
              emptyMsg="No pending actions."
            />
          )}
        </div>
      )}
    </motion.div>
  );
};
