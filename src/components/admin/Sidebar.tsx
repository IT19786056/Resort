import React from 'react';
import { 
  Building2, 
  BedDouble, 
  CalendarCheck, 
  Clock, 
  LogOut,
  Users
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  bookingsCount: number;
  pastBookingsCount: number;
  handleLogout: () => void;
  isAdmin: boolean;
}

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  bookingsCount, 
  pastBookingsCount, 
  handleLogout,
  isAdmin
}: SidebarProps) => {
  return (
    <aside className="w-72 bg-white border-r border-natural-accent flex flex-col p-8 fixed h-full z-40">
      <div className="mb-12">
        <h1 className="font-serif text-2xl font-bold text-natural-dark italic">Admin Panel</h1>
        <p className="text-[10px] uppercase tracking-widest text-natural-muted font-bold mt-1">Ahsell Resorts Manager</p>
      </div>

      <nav className="flex-1 space-y-4">
        <SidebarButton 
          active={activeTab === 'bookings'} 
          onClick={() => setActiveTab('bookings')}
          icon={<CalendarCheck className="w-5 h-5" />}
          label="Bookings"
          count={bookingsCount}
        />
        <SidebarButton 
          active={activeTab === 'past_bookings'} 
          onClick={() => setActiveTab('past_bookings')}
          icon={<Clock className="w-5 h-5" />}
          label="Past Bookings"
          count={pastBookingsCount}
        />
        <SidebarButton 
          active={activeTab === 'hotels'} 
          onClick={() => setActiveTab('hotels')}
          icon={<Building2 className="w-5 h-5" />}
          label="Hotels"
        />
        <SidebarButton 
          active={activeTab === 'rooms'} 
          onClick={() => setActiveTab('rooms')}
          icon={<BedDouble className="w-5 h-5" />}
          label="Rooms"
        />
        {isAdmin && (
          <SidebarButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
            icon={<Users className="w-5 h-5" />}
            label="Users"
          />
        )}
      </nav>

      <button 
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 p-4 text-natural-muted hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl font-bold uppercase text-[10px] tracking-widest"
      >
        <LogOut className="w-5 h-5" />
        Log Out
      </button>
    </aside>
  );
};

const SidebarButton = ({ active, onClick, icon, label, count }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-natural-primary text-white shadow-xl shadow-natural-primary/20' : 'text-natural-muted hover:bg-natural-accent hover:text-natural-dark'}`}
  >
    <div className="flex items-center gap-4">
      {icon}
      <span className="font-bold uppercase text-[10px] tracking-widest">{label}</span>
    </div>
    {count !== undefined && (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-natural-accent text-natural-muted'}`}>
        {count}
      </span>
    )}
  </button>
);
