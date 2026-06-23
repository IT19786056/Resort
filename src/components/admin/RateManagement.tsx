import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Edit, Trash2, AlertTriangle, X, BedDouble, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Hotel, Accommodation } from '../../types';
import { Modal, Input, SectionLabel } from './Shared';

interface RateOverride {
  id: string;
  roomId: string;
  hotelId: string;
  fromDate: string;
  toDate: string;
  price: number;
  label?: string | null;
  createdAt: string;
  roomName?: string;
  hotelName?: string;
}

interface RateManagementProps {
  hotels: Hotel[];
  rooms: Accommodation[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onProcessing: (msg: string) => void;
}

const token = () => localStorage.getItem('resort_customer_token') ?? '';

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const nightCount = (from: string, to: string) =>
  Math.max(0, Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000)) + 1;

// Does override A overlap override B?
const overlaps = (a: RateOverride, b: RateOverride) =>
  a.id !== b.id && a.fromDate <= b.toDate && a.toDate >= b.fromDate;

const hasAnyOverlap = (ov: RateOverride, all: RateOverride[]) =>
  all.some(other => overlaps(ov, other));

// ── Delete confirm ─────────────────────────────────────────────────────────────
const DeleteConfirm = ({ target, onClose, onConfirm }: { target: RateOverride; onClose: () => void; onConfirm: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-center space-y-2">
        <p className="font-serif italic text-lg text-natural-dark">Remove Rate Override?</p>
        <p className="text-xs text-natural-muted">
          {target.label ? `"${target.label}" · ` : ''}{fmtDate(target.fromDate)} – {fmtDate(target.toDate)} will revert to base price.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 border border-natural-accent text-natural-dark py-3.5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-bg transition-all">
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-3.5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-red-600 transition-all">
          Remove
        </button>
      </div>
    </motion.div>
  </div>
);

// ── Rate form modal ────────────────────────────────────────────────────────────
const RateForm = ({
  editing,
  roomId,
  hotelId,
  onClose,
  onSaved,
  onProcessing,
  onError,
}: {
  editing: RateOverride | null;
  roomId: string;
  hotelId: string;
  onClose: () => void;
  onSaved: (r: RateOverride) => void;
  onProcessing: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [form, setForm] = useState({
    label:    editing?.label    ?? '',
    fromDate: editing?.fromDate ?? '',
    toDate:   editing?.toDate   ?? '',
    price:    editing?.price != null ? String(editing.price) : '',
  });
  const [saving, setSaving] = useState(false);

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.price) {
      onError('From date, to date, and price are required.');
      return;
    }
    if (form.toDate < form.fromDate) {
      onError('"To" date must be on or after "From" date.');
      return;
    }
    if (Number(form.price) < 0) {
      onError('Price must be a positive number.');
      return;
    }

    setSaving(true);
    onProcessing(editing ? 'Saving changes…' : 'Creating rate override…');

    try {
      const method = editing ? 'PATCH' : 'POST';
      const url    = editing ? `/api/admin/rate-overrides/${editing.id}` : '/api/admin/rate-overrides';
      const body   = editing
        ? { fromDate: form.fromDate, toDate: form.toDate, price: Number(form.price), label: form.label || null }
        : { roomId, hotelId, fromDate: form.fromDate, toDate: form.toDate, price: Number(form.price), label: form.label || null };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      onSaved(data);
      onClose();
    } catch (err: any) {
      onError(err.message || 'Failed to save rate override.');
    } finally {
      setSaving(false);
    }
  };

  const dateCls = 'w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark text-sm';

  return (
    <Modal title={editing ? 'Edit Rate Override' : 'New Rate Override'} onClose={onClose}>
      <div className="space-y-5">
        <Input label="Label (optional)" placeholder="e.g. High Season, Christmas, Long Weekend" value={form.label} onChange={(v: string) => f('label', v)} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionLabel label="From Date *" />
            <input type="date" value={form.fromDate} onChange={e => f('fromDate', e.target.value)} className={dateCls} />
          </div>
          <div className="space-y-2">
            <SectionLabel label="To Date *" />
            <input type="date" value={form.toDate} min={form.fromDate || undefined} onChange={e => f('toDate', e.target.value)} className={dateCls} />
          </div>
        </div>
        <div className="space-y-2">
          <SectionLabel label="Price per Night *" />
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted pointer-events-none" />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={e => f('price', e.target.value)}
              className="w-full pl-10 pr-4 bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark"
            />
          </div>
          {form.fromDate && form.toDate && form.toDate >= form.fromDate && (
            <p className="text-[11px] text-natural-muted px-1">
              Covers {nightCount(form.fromDate, form.toDate)} night{nightCount(form.fromDate, form.toDate) !== 1 ? 's' : ''}
              {form.price ? ` · Total: $${(Number(form.price) * nightCount(form.fromDate, form.toDate)).toFixed(2)}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-4 pt-2">
          <button onClick={onClose} className="flex-1 border border-natural-accent text-natural-dark py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-bg transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-natural-primary text-white py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all disabled:opacity-50 shadow-lg shadow-natural-primary/20">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Override'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Override row ───────────────────────────────────────────────────────────────
const OverrideRow = ({
  ov,
  allForRoom,
  basePrice,
  onEdit,
  onDelete,
}: {
  ov: RateOverride;
  allForRoom: RateOverride[];
  basePrice?: number;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const clash = hasAnyOverlap(ov, allForRoom);
  const nights = nightCount(ov.fromDate, ov.toDate);
  const priceDiff = basePrice != null ? ov.price - basePrice : null;

  return (
    <div className={`p-5 bg-white border rounded-2xl transition-all ${clash ? 'border-amber-200 bg-amber-50/30' : 'border-natural-accent hover:shadow-sm'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {ov.label && (
              <span className="font-bold text-natural-dark text-sm">{ov.label}</span>
            )}
            {clash && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-2.5 h-2.5" />
                Overlaps
              </span>
            )}
          </div>
          <p className="text-xs text-natural-muted mt-1">
            {fmtDate(ov.fromDate)} – {fmtDate(ov.toDate)}
            <span className="ml-2 text-[10px]">({nights} night{nights !== 1 ? 's' : ''})</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right mr-2">
            <p className="font-bold text-natural-dark text-sm">${Number(ov.price).toFixed(2)}<span className="text-[10px] font-normal text-natural-muted">/night</span></p>
            {priceDiff != null && (
              <p className={`text-[10px] font-bold ${priceDiff > 0 ? 'text-emerald-600' : priceDiff < 0 ? 'text-red-500' : 'text-natural-muted'}`}>
                {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)} vs base
              </p>
            )}
          </div>
          <button onClick={onEdit} className="p-2 rounded-full hover:bg-natural-accent text-natural-muted hover:text-natural-dark transition-all">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-full hover:bg-red-50 text-natural-muted hover:text-red-500 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const RateManagement = ({ hotels, rooms, onSuccess, onError, onProcessing }: RateManagementProps) => {
  const [selectedHotelId, setSelectedHotelId] = useState(hotels.length === 1 ? hotels[0].id : '');
  const [selectedRoomId,  setSelectedRoomId]  = useState('');
  const [overrides,  setOverrides]  = useState<RateOverride[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<RateOverride | null>(null);
  const [delTarget,  setDelTarget]  = useState<RateOverride | null>(null);

  const filteredRooms = rooms.filter(r => !selectedHotelId || r.hotelId === selectedHotelId);
  const selectedRoom  = rooms.find(r => r.id === selectedRoomId);

  const load = async (roomId: string) => {
    if (!roomId) { setOverrides([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rate-overrides?roomId=${roomId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Failed to load rate overrides.');
      setOverrides(await res.json());
    } catch (err: any) {
      onError(err.message || 'Failed to load rate overrides.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedRoomId); }, [selectedRoomId]);

  // If hotel changes, reset room
  const handleHotelChange = (id: string) => {
    setSelectedHotelId(id);
    setSelectedRoomId('');
    setOverrides([]);
  };

  const handleSaved = (saved: RateOverride) => {
    setOverrides(prev => {
      const idx = prev.findIndex(o => o.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next.sort((a, b) => a.fromDate.localeCompare(b.fromDate)); }
      return [...prev, saved].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    });
    onSuccess(editing ? 'Rate override updated.' : 'Rate override created.');
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    onProcessing('Removing rate override…');
    try {
      const res = await fetch(`/api/admin/rate-overrides/${delTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete.');
      setOverrides(prev => prev.filter(o => o.id !== delTarget!.id));
      onSuccess('Rate override removed.');
    } catch (err: any) {
      onError(err.message || 'Failed to delete rate override.');
    } finally {
      setDelTarget(null);
    }
  };

  const selectCls = 'bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark text-sm appearance-none cursor-pointer';
  const clashCount = overrides.filter(o => hasAnyOverlap(o, overrides)).length;

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
            <TrendingUp className="w-5 h-5 text-natural-primary" />
            <h2 className="font-serif text-2xl italic text-natural-dark">Rate Management</h2>
          </div>
        </div>

        {/* Selectors */}
        <div className="flex gap-3 flex-wrap items-center">
          {hotels.length > 1 && (
            <select value={selectedHotelId} onChange={e => handleHotelChange(e.target.value)} className={selectCls}>
              <option value="">Select hotel…</option>
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <select
            value={selectedRoomId}
            onChange={e => { setSelectedRoomId(e.target.value); setOverrides([]); }}
            className={`${selectCls} flex-1 min-w-[200px]`}
            disabled={hotels.length > 1 && !selectedHotelId}
          >
            <option value="">Select room to manage rates…</option>
            {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {selectedRoomId && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-2 px-5 py-4 bg-natural-primary text-white rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all shadow-lg shadow-natural-primary/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Override
            </button>
          )}
        </div>

        {/* Content */}
        {!selectedRoomId ? (
          <div className="py-20 bg-white border border-natural-accent rounded-3xl flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
              <BedDouble className="w-8 h-8 text-natural-muted" />
            </div>
            <p className="text-xs text-natural-muted font-medium">Select a room above to manage its seasonal rates.</p>
          </div>
        ) : loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-natural-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-natural-muted animate-pulse">Loading…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Room summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 px-1">
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-natural-muted" />
                <span className="font-bold text-natural-dark text-sm">{selectedRoom?.name}</span>
                {selectedRoom?.price != null && (
                  <span className="text-[11px] text-natural-muted">
                    Base: <span className="font-bold text-natural-dark">${Number(selectedRoom.price).toFixed(2)}/night</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-natural-muted">
                {overrides.length} override{overrides.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Clash warning */}
            {clashCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {clashCount} override{clashCount !== 1 ? 's overlap' : ' overlaps'} with another. When dates conflict, the most recently created override takes effect.
              </div>
            )}

            {overrides.length === 0 ? (
              <div className="py-12 bg-white border border-natural-accent rounded-2xl flex flex-col items-center text-center gap-3">
                <TrendingUp className="w-7 h-7 text-natural-muted" />
                <div>
                  <p className="text-sm font-bold text-natural-dark">No rate overrides yet</p>
                  <p className="text-xs text-natural-muted mt-1">Guests pay the base price of ${Number(selectedRoom?.price ?? 0).toFixed(2)}/night for all dates.</p>
                </div>
                <button
                  onClick={() => { setEditing(null); setShowForm(true); }}
                  className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-natural-primary text-white rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Override
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {overrides.map(ov => (
                  <OverrideRow
                    key={ov.id}
                    ov={ov}
                    allForRoom={overrides}
                    basePrice={selectedRoom?.price != null ? Number(selectedRoom.price) : undefined}
                    onEdit={() => { setEditing(ov); setShowForm(true); }}
                    onDelete={() => setDelTarget(ov)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Rate form modal */}
      <AnimatePresence>
        {showForm && selectedRoomId && (
          <RateForm
            editing={editing}
            roomId={selectedRoomId}
            hotelId={selectedHotelId || (selectedRoom?.hotelId ?? '')}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={handleSaved}
            onProcessing={onProcessing}
            onError={onError}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {delTarget && (
          <DeleteConfirm
            target={delTarget}
            onClose={() => setDelTarget(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
};
