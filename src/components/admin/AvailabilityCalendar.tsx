import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { dbService } from '../../services/db';
import { Hotel, RoomCalendar, CalendarDay } from '../../types';

interface AvailabilityCalendarProps {
  hotels: Hotel[];
  onError?: (msg: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Local YYYY-MM-DD — matches the server's plain-date handling (no timezone shift).
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const AvailabilityCalendar = ({ hotels, onError }: AvailabilityCalendarProps) => {
  const [anchor, setAnchor] = useState(() => new Date());
  const [hotelId, setHotelId] = useState<string>('');
  const [data, setData] = useState<RoomCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  // Every night of the displayed month — the column set for the grid.
  const days = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = fmt(new Date());
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dateObj = new Date(year, month, i + 1);
      const wd = dateObj.getDay();
      return {
        date: fmt(dateObj),
        dayNum: i + 1,
        weekday: WEEKDAYS[wd],
        isWeekend: wd === 0 || wd === 6,
        isToday: fmt(dateObj) === todayStr,
      };
    });
  }, [year, month]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const monthStart = fmt(new Date(year, month, 1));
        const monthEnd = fmt(new Date(year, month + 1, 1)); // exclusive
        const res = await dbService.getCalendar(monthStart, monthEnd, hotelId || undefined);
        if (active) setData(res || []);
      } catch (e: any) {
        if (active) {
          setData([]);
          onError?.(e.message || 'Failed to load calendar');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [hotelId, year, month]);

  // Per-room date → day lookup for O(1) cell access.
  const dayMapByRoom = useMemo(() => {
    const m = new Map<string, Map<string, CalendarDay>>();
    for (const room of data) {
      const inner = new Map<string, CalendarDay>();
      for (const d of room.days) inner.set(d.date, d);
      m.set(room.roomId, inner);
    }
    return m;
  }, [data]);

  const hotelName = (id: string) => hotels.find(h => h.id === id)?.name || '—';

  const goPrevMonth = () => setAnchor(new Date(year, month - 1, 1));
  const goNextMonth = () => setAnchor(new Date(year, month + 1, 1));
  const goToday = () => setAnchor(new Date());

  const cellClasses = (room: RoomCalendar, cd?: CalendarDay) => {
    if (room.manualStopSell) return 'bg-slate-200 text-slate-500';
    if (!cd) return 'bg-white text-natural-muted';
    if (cd.available <= 0) return 'bg-red-100 text-red-700';
    if (cd.available < room.quantity) return 'bg-amber-100 text-amber-800';
    return 'bg-green-50 text-green-700';
  };

  const cellLabel = (room: RoomCalendar, cd?: CalendarDay) => {
    if (room.manualStopSell) return '×';
    if (!cd) return '–';
    return String(cd.available);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-5 rounded-3xl border border-natural-accent shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={goPrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-natural-accent text-natural-dark hover:bg-natural-bg transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[160px] text-center">
            <span className="font-serif text-xl italic text-natural-dark">{MONTHS[month]} {year}</span>
          </div>
          <button
            onClick={goNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-natural-accent text-natural-dark hover:bg-natural-bg transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="ml-2 px-4 py-2 rounded-full border border-natural-accent text-natural-dark hover:bg-natural-bg transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            Today
          </button>
        </div>

        <select
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          className="bg-natural-bg border border-natural-accent rounded-2xl px-4 py-3 text-xs font-bold text-natural-dark outline-none focus:ring-1 focus:ring-natural-primary cursor-pointer"
        >
          <option value="">All Properties</option>
          {hotels.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-natural-muted px-1">
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-green-50 border border-green-200" /> Open</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-amber-100 border border-amber-200" /> Partly booked</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-red-100 border border-red-200" /> Sold out</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-slate-200 border border-slate-300" /> Closed</span>
        <span className="ml-auto normal-case tracking-normal font-medium">Numbers = units still available that night</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bg-white rounded-[32px] border border-natural-accent p-20 text-center italic text-natural-muted">
          Loading calendar…
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-[32px] border-2 border-dashed border-natural-accent p-16 md:p-20 text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
            <CalendarDays className="w-8 h-8 text-natural-muted" />
          </div>
          <p className="font-serif italic text-xl text-natural-muted">No rooms found for this selection.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-natural-accent shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr className="border-b border-natural-accent bg-natural-bg/40">
                  <th className="sticky left-0 z-10 bg-natural-bg/40 text-left py-4 px-5 min-w-[200px] text-[10px] uppercase font-bold text-natural-muted tracking-widest">
                    Room / Property
                  </th>
                  {days.map(d => (
                    <th
                      key={d.date}
                      className={`py-2 px-0 w-10 min-w-[2.5rem] text-center ${d.isWeekend ? 'bg-natural-accent/30' : ''}`}
                    >
                      <div className="text-[8px] uppercase font-bold text-natural-muted tracking-wider">{d.weekday}</div>
                      <div className={`text-xs font-bold mt-0.5 ${d.isToday ? 'text-white bg-natural-primary rounded-full w-6 h-6 flex items-center justify-center mx-auto' : 'text-natural-dark'}`}>
                        {d.dayNum}
                      </div>
                    </th>
                  ))}
                  <th className="py-4 px-4 text-center text-[10px] uppercase font-bold text-natural-muted tracking-widest min-w-[70px]">Occ.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-accent">
                {data.map(room => {
                  const inner = dayMapByRoom.get(room.roomId);
                  const capacity = room.quantity * days.length;
                  const bookedNights = room.days.reduce((s, d) => s + d.booked, 0);
                  const occ = capacity > 0 ? Math.round((bookedNights / capacity) * 100) : 0;
                  return (
                    <tr key={room.roomId} className="hover:bg-natural-bg/20">
                      <td className="sticky left-0 z-10 bg-white py-3 px-5 min-w-[200px]">
                        <p className="font-bold text-natural-dark text-sm truncate max-w-[180px]">{room.name}</p>
                        <p className="text-[10px] text-natural-muted uppercase font-bold tracking-wider truncate max-w-[180px]">
                          {hotelName(room.hotelId)} · {room.quantity} unit{room.quantity > 1 ? 's' : ''}
                        </p>
                      </td>
                      {days.map(d => {
                        const cd = inner?.get(d.date);
                        return (
                          <td key={d.date} className="p-0.5 text-center">
                            <div
                              title={`${room.name} — ${d.date}: ${room.manualStopSell ? 'Closed' : `${cd?.available ?? 0}/${room.quantity} available, ${cd?.booked ?? 0} booked`}`}
                              className={`w-9 h-9 mx-auto rounded-lg flex items-center justify-center text-[11px] font-bold ${cellClasses(room, cd)}`}
                            >
                              {cellLabel(room, cd)}
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-bold ${occ >= 80 ? 'text-red-600' : occ >= 40 ? 'text-amber-600' : 'text-green-600'}`}>
                          {occ}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
