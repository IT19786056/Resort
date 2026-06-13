import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DatePickerInputProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string; // YYYY-MM-DD
  /** Renders as a full-width bordered form field (for use inside modals / scrollable containers) */
  fieldStyle?: boolean;
}

export const DatePickerInput = ({ label, value, onChange, min, fieldStyle = false }: DatePickerInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + 'T00:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 300 });

  // Close on outside click — the fixed dropdown is still a DOM child of containerRef so contains() works
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close fixed dropdown on any scroll (modal scroll detaches it visually)
  useEffect(() => {
    if (!fieldStyle || !isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [fieldStyle, isOpen]);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const today = new Date().toISOString().split('T')[0];

  const prevMonth = () =>
    setViewDate(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });

  const nextMonth = () =>
    setViewDate(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  const handleDayClick = (dateStr: string) => {
    if (min && dateStr < min) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleOpen = () => {
    if (fieldStyle && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 300),
      });
    }
    setIsOpen(v => !v);
  };

  const renderDays = () => {
    const totalDays = getDaysInMonth(viewDate.year, viewDate.month);
    const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month);
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`pad-${i}`} />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = toDateStr(viewDate.year, viewDate.month, d);
      const disabled = !!(min && dateStr < min);
      const selected = dateStr === value;
      const isToday = dateStr === today;

      cells.push(
        <button
          key={dateStr}
          type="button"
          disabled={disabled}
          onClick={() => handleDayClick(dateStr)}
          className={[
            'w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-all mx-auto',
            selected
              ? 'bg-natural-primary text-white font-bold shadow-md'
              : isToday && !disabled
              ? 'border-2 border-natural-primary text-natural-primary font-bold'
              : disabled
              ? 'text-natural-accent cursor-not-allowed'
              : 'text-natural-dark hover:bg-natural-primary/10 hover:text-natural-primary cursor-pointer',
          ].join(' ')}
        >
          {d}
        </button>
      );
    }
    return cells;
  };

  const calendarContent = (
    <div className="bg-white border border-natural-accent rounded-3xl shadow-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-natural-cream text-natural-dark transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-natural-dark">
          {MONTHS[viewDate.month]} {viewDate.year}
        </span>
        <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-natural-cream text-natural-dark transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[9px] font-bold uppercase tracking-wider text-natural-muted py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">{renderDays()}</div>

      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setIsOpen(false); }}
          className="mt-4 w-full text-center text-[10px] font-bold uppercase tracking-widest text-natural-muted hover:text-red-500 transition-colors border-t border-natural-accent pt-3"
        >
          Clear Date
        </button>
      )}
    </div>
  );

  // ── Field style variant (for forms / modals) ─────────────────────────────
  if (fieldStyle) {
    return (
      <div ref={containerRef} className="relative">
        <div
          onClick={handleOpen}
          className={`w-full bg-natural-bg border ${isOpen ? 'border-natural-primary ring-2 ring-natural-primary/20' : 'border-natural-accent'} rounded-full px-6 py-3.5 flex items-center justify-between cursor-pointer transition-all hover:border-natural-primary/50`}
        >
          <span className={`text-sm font-medium ${value ? 'text-natural-dark' : 'text-natural-muted'}`}>
            {formatDisplay(value)}
          </span>
          <Calendar className="w-4 h-4 text-natural-primary shrink-0" />
        </div>
        {isOpen && (
          <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}>
            {calendarContent}
          </div>
        )}
      </div>
    );
  }

  // ── Inline style variant (for FilterBar) ─────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <span className="text-[10px] uppercase font-bold text-natural-muted mb-1 flex items-center tracking-widest">
        <Calendar className="w-3 h-3 mr-2 text-natural-primary" />
        {label}
      </span>
      <div
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center cursor-pointer select-none"
      >
        <span className={`text-sm font-bold ${value ? 'text-natural-dark' : 'text-natural-muted'}`}>
          {formatDisplay(value)}
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 z-[200] w-[300px]">
          {calendarContent}
        </div>
      )}
    </div>
  );
};
