import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../../services/db';
import { auth } from '../../lib/auth';
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
  MapPin,
  LogOut,
  Menu,
  Camera,
  Upload,
  Bell,
  Search,
  LayoutGrid,
  Table
} from 'lucide-react';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../lib/cloudinary';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { UsersList } from './UsersList';
import { AdminLogsList } from './AdminLogsList';
import { TenantManagement } from './TenantManagement';
import { TodayDashboard } from './TodayDashboard';
import { GuestDirectory } from './GuestDirectory';
import { RateManagement } from './RateManagement';
import { LoadingPlane } from '../ui/LoadingPlane';
import { Toast } from '../ui/Toast';
import { Modal, Input, SectionLabel } from './Shared';
import { ImageGalleryUpload } from './ImageGalleryUpload';
import { HeroMediaManager } from './HeroMediaManager';
import { AvailabilityCalendar } from './AvailabilityCalendar';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
import { triggerDataRefresh } from '../../lib/events';

type AdminTab = 'today' | 'hotels' | 'rooms' | 'bookings' | 'past_bookings' | 'guests' | 'users' | 'logs' | 'hero_media' | 'calendar' | 'tenants' | 'rates';

export const AdminDashboard = ({ profile }: { profile: AdminProfile }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(profile.role === 'admin' ? 'bookings' : 'bookings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Accommodation[]>([]);
  const [stats, setStats] = useState<{ active: number; past: number }>({ active: 0, past: 0 });
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'loading' | 'info', isVisible: boolean }>({
    message: '', type: 'success', isVisible: false
  });
  
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingRoom, setEditingRoom] = useState<Accommodation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'hotel' | 'room', name: string } | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [h, r, s] = await Promise.all([
        dbService.getHotels(),
        dbService.getRooms(),
        dbService.getBookingStats()
      ]);
      setHotels(h || []);
      setRooms(r || []);
      setStats(s || { active: 0, past: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'loading' | 'info' = 'success', duration = 3000) => {
    setToast({ message, type, isVisible: true });
    if (type !== 'loading') {
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), duration);
    }
  };

  const handleLogout = () => auth.signOut();

  const activeBookingsCount = stats.active;
  const pastBookingsCount = stats.past;

  return (
    <div className="min-h-screen bg-natural-bg flex">
      <AnimatePresence>
        {isInitialLoad && <LoadingPlane label="Synchronizing Dashboard" />}
      </AnimatePresence>
      <Toast 
        {...toast} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
      
      {!isInitialLoad && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex flex-1 min-h-screen relative overflow-x-hidden"
        >
          {/* Mobile Sidebar Overlay Backdrop */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-natural-dark/40 backdrop-blur-sm z-40 md:hidden"
              />
            )}
          </AnimatePresence>

          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            bookingsCount={activeBookingsCount}
            pastBookingsCount={pastBookingsCount}
            handleLogout={handleLogout}
            isAdmin={profile.role === 'admin' || profile.role === 'superadmin'}
            isSuperAdmin={profile.role === 'superadmin'}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <main className="md:ml-72 flex-1 p-6 md:p-12 overflow-y-auto w-full">
            {/* Mobile Header Bar Toggle */}
            <div className="flex md:hidden items-center justify-between mb-8 pb-4 border-b border-natural-accent">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 bg-white border border-natural-accent rounded-2xl text-natural-dark hover:bg-natural-bg transition-all shadow-sm"
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-serif text-lg font-bold italic text-natural-dark">Resorts Admin</span>
              <div className="w-11" /> {/* Perfect horizontal symmetry spacer */}
            </div>

            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-12">
              <h2 className="font-serif text-2xl md:text-4xl italic text-natural-dark capitalize">{activeTab.replace('_', ' ')}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handleLogout}
                  className="px-6 py-3 rounded-full flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest text-natural-muted hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
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
                  {activeTab === 'bookings' || activeTab === 'past_bookings' ? (
                    <AdminBookingsList
                      rooms={rooms}
                      hotels={hotels}
                      onUpdate={() => fetchData(true)}
                      type={activeTab === 'bookings' ? 'active' : 'past'}
                      onSuccess={(msg: string) => showToast(msg)}
                      onError={(err: string) => showToast(err, 'error')}
                      onProcessing={(msg: string) => showToast(msg, 'loading')}
                    />
                  ) : null}
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
                      setRooms={setRooms}
                      hotels={hotels} 
                      onEdit={(r: Accommodation) => { setEditingRoom(r); setShowRoomForm(true); }} 
                      onDelete={(r: Accommodation) => setDeleteTarget({ id: r.id, type: 'room', name: r.name })}
                      onUpdate={fetchData} 
                      onSuccess={(msg: string) => showToast(msg)}
                      onError={(err: string) => showToast(err, 'error')}
                      onProcessing={(msg: string) => showToast(msg, 'loading')}
                    />
                  )}
                  {activeTab === 'users' && (profile.role === 'admin' || profile.role === 'superadmin') && (
                    <UsersList
                      onUpdate={() => fetchData(true)}
                      onSuccess={(msg) => showToast(msg)}
                      onError={(err) => showToast(err, 'error')}
                      onProcessing={(msg) => showToast(msg, 'loading')}
                    />
                  )}
                  {activeTab === 'guests' && (profile.role === 'admin' || profile.role === 'superadmin') && (
                    <GuestDirectory
                      hotels={hotels}
                      onError={(err) => showToast(err, 'error')}
                    />
                  )}
                  {activeTab === 'logs' && (profile.role === 'admin' || profile.role === 'superadmin') && (
                    <AdminLogsList />
                  )}
                  {activeTab === 'tenants' && profile.role === 'superadmin' && (
                    <TenantManagement
                      hotels={hotels}
                      onSuccess={(msg) => showToast(msg)}
                      onError={(err) => showToast(err, 'error')}
                      onProcessing={(msg) => showToast(msg, 'loading')}
                    />
                  )}
                  {activeTab === 'today' && (
                    <TodayDashboard
                      onSuccess={(msg) => showToast(msg)}
                      onError={(err) => showToast(err, 'error')}
                    />
                  )}
                  {activeTab === 'hero_media' && (
                    <HeroMediaManager
                      onSuccess={(msg) => showToast(msg)}
                      onError={(err) => showToast(err, 'error')}
                      onProcessing={(msg) => showToast(msg, 'loading')}
                    />
                  )}
                  {activeTab === 'rates' && (
                    <RateManagement
                      hotels={hotels}
                      rooms={rooms}
                      onSuccess={(msg) => showToast(msg)}
                      onError={(err) => showToast(err, 'error')}
                      onProcessing={(msg) => showToast(msg, 'loading')}
                    />
                  )}
                  {activeTab === 'calendar' && (
                    <AvailabilityCalendar
                      hotels={hotels}
                      onSuccess={(msg) => showToast(msg)}
                      onError={(err) => showToast(err, 'error')}
                    />
                  )}
                </>
              )}
            </section>
          </main>
        </motion.div>
      )}

      <AnimatePresence>
        {showHotelForm && (
          <HotelForm 
            hotel={editingHotel} 
            rooms={rooms}
            onClose={() => setShowHotelForm(false)} 
            onSuccess={(msg: string) => { 
                showToast(msg || 'Hotel updated successfully');
                setShowHotelForm(false); 
                fetchData(true); 
                triggerDataRefresh();
            }} 
            onError={(err: string) => showToast(err, 'error')}
            onProcessing={(msg: string) => showToast(msg, 'loading')}
          />
        )}
        {showRoomForm && (
          <RoomForm 
            room={editingRoom} 
            hotels={hotels}
            onClose={() => setShowRoomForm(false)} 
            onSuccess={(msg: string) => { 
                showToast(msg || 'Room updated successfully');
                setShowRoomForm(false); 
                fetchData(true); 
                triggerDataRefresh();
            }} 
            onError={(err: string) => showToast(err, 'error')}
            onProcessing={(msg: string) => showToast(msg, 'loading')}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal 
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={async () => {
              showToast(`Deleting ${deleteTarget.name}...`, 'loading');
              try {
                if (deleteTarget.type === 'hotel') {
                  await dbService.deleteHotel(deleteTarget.id);
                } else {
                  await dbService.deleteRoom(deleteTarget.id);
                }
                showToast(`${deleteTarget.name} deleted successfully`);
                setDeleteTarget(null);
                fetchData(true);
                triggerDataRefresh();
              } catch (e: any) {
                showToast(e.message || 'Deletion failed', 'error');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Embedded Components (Refactored from original Admin.tsx) ---

const AdminBookingsList = ({ rooms, hotels, onUpdate, type, onSuccess, onError, onProcessing }: any) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const itemsPerPage = 10;
  const [items, setItems] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters (applied server-side)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Active bookings awaiting staff action (powers the alerts banner).
  const [alerts, setAlerts] = useState<Booking[]>([]);

  // Reset filters & page when switching between Active and Past.
  useEffect(() => {
    setSearchTerm(''); setDebouncedSearch(''); setStatusFilter('all');
    setHotelFilter('all'); setFromDate(''); setToDate(''); setPage(1);
  }, [type]);

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Any filter change returns to page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, hotelFilter, fromDate, toDate]);

  // Local storage seen bookings tracker
  const [seenBookingIds, setSeenBookingIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('resort_seen_bookings_v1');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const markAsRead = (id: string) => {
    setSeenBookingIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem('resort_seen_bookings_v1', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const markAllAsRead = () => {
    const ids = alerts.map((b: Booking) => b.id);
    setSeenBookingIds(prev => {
      const next = Array.from(new Set([...prev, ...ids]));
      try {
        localStorage.setItem('resort_seen_bookings_v1', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    onSuccess?.("All notification alerts cleared");
  };

  // Automatically mark bookings as read when they are clicked/selected
  useEffect(() => {
    if (selectedBooking) {
      markAsRead(selectedBooking.id);
    }
  }, [selectedBooking]);

  // Fetch the current page whenever the tab, page, or any filter changes.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await dbService.getAdminBookings({
          scope: type,
          page,
          pageSize: itemsPerPage,
          search: debouncedSearch || undefined,
          status: statusFilter,
          hotelId: hotelFilter,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        if (active) { setItems(res.items || []); setTotal(res.total || 0); }
      } catch (e: any) {
        if (active) { setItems([]); setTotal(0); onError?.(e.message || 'Failed to load bookings'); }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, page, debouncedSearch, statusFilter, hotelFilter, fromDate, toDate, refreshKey]);

  // Actionable-booking alerts (active tab only).
  useEffect(() => {
    if (type !== 'active') { setAlerts([]); return; }
    let active = true;
    dbService.getBookingAlerts()
      .then(res => { if (active) setAlerts(res || []); })
      .catch(() => { if (active) setAlerts([]); });
    return () => { active = false; };
  }, [type, refreshKey]);

  const alertIdSet = React.useMemo(() => new Set(alerts.map(a => a.id)), [alerts]);
  // Alerts not yet dismissed by this browser.
  const unreadBookings = React.useMemo(
    () => alerts.filter((b: Booking) => !seenBookingIds.includes(b.id)),
    [alerts, seenBookingIds]
  );

  // Aliases so the markup below reads naturally.
  const paginatedBookings = items;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const hasActiveFilters = !!debouncedSearch || statusFilter !== 'all' || hotelFilter !== 'all' || !!fromDate || !!toDate;

  const handleStatusUpdate = async (id: string, status: 'pending' | 'confirmed' | 'cancelled', reason?: string) => {
    if (isUpdating) return;
    const booking = selectedBooking || items.find((b: any) => b.id === id) || alerts.find((b: any) => b.id === id);
    if (!booking) return;

    const isReject = status === 'pending'; // staff rejected the uploaded slip

    // Optimistically update the current page for snappy feedback.
    const originalItems = items;
    setItems(prev => prev.map((b: any) => b.id === id
      ? { ...b, status, cancellationReason: reason || b.cancellationReason, paymentSlipUrl: isReject ? undefined : b.paymentSlipUrl }
      : b));

    // Speed up UX: dismiss modals/dialogs instantly
    setSelectedBooking(null);
    setShowCancelDialog(false);
    setCancelReason('');

    onProcessing?.(status === 'confirmed' ? 'Confirming reservation...' : isReject ? 'Rejecting payment slip...' : 'Cancelling booking...');
    setIsUpdating(true);
    try {
      const updateData: any = { status };
      if (reason) updateData.cancellationReason = reason;
      if (isReject) updateData.paymentSlipUrl = null; // clear so the guest re-uploads

      await dbService.updateBooking(id, updateData);
      onSuccess?.(status === 'confirmed' ? 'Reservation confirmed' : isReject ? 'Payment slip rejected' : 'Booking cancelled');
      onUpdate?.(true);          // refresh sidebar counts
      triggerDataRefresh();      // refresh storefront availability
      setRefreshKey(k => k + 1); // re-pull the page + alerts from the server
    } catch (error: any) {
      console.error(error);
      setItems(originalItems);   // rollback optimistic change
      onError?.(error.message || 'Operation failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* 1. New Booking Alerts Banner */}
      {unreadBookings.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 p-6 md:p-8 rounded-[32px] shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-amber-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-amber-700 animate-bounce" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm md:text-base">New Booking Alerts</h3>
                <p className="text-xs text-amber-700/80 mt-0.5">You have {unreadBookings.length} booking request{unreadBookings.length > 1 ? 's' : ''} requiring review in the bookings panel.</p>
              </div>
            </div>
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 border border-amber-300 text-amber-800 bg-white hover:bg-amber-100/50 rounded-full font-bold uppercase text-[9px] tracking-widest transition-all"
            >
              Clear All Alerts
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-2 custom-modal-scrollbar">
            {unreadBookings.map((b: Booking) => {
              const room = rooms.find((r: any) => r.id === b.roomId);
              const hotel = hotels.find((h: any) => h.id === b.hotelId);
              return (
                <div 
                  key={b.id}
                  className="bg-white/80 p-4 border border-amber-200/50 rounded-2xl flex items-center justify-between gap-4 group hover:bg-white hover:border-amber-400 transition-all cursor-pointer relative"
                  onClick={() => setSelectedBooking(b)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shrink-0" />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-xs text-stone-900 group-hover:text-natural-primary transition-colors truncate">{b.fullName}</h4>
                      <p className="text-[10px] text-stone-500 mt-0.5 truncate">{hotel?.name} — {room?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(b.id);
                        onSuccess?.("Alert cleared");
                      }}
                      className="p-1.5 px-3 border border-stone-200 text-stone-700 hover:border-amber-300 hover:text-amber-800 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-white transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1.5. Filters + view toggle (server-side) */}
      <div className="bg-white p-5 rounded-3xl border border-natural-accent shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
            <input
              type="text"
              placeholder="Search by guest, email, phone, property, status or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-natural-bg/60 border border-natural-accent rounded-2xl focus:outline-none focus:ring-1 focus:ring-natural-primary text-xs font-bold text-natural-dark placeholder-natural-muted tracking-tight transition-all"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-natural-primary text-white px-4 py-2.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all shadow-lg shadow-natural-primary/20"
            >
              <Plus className="w-3.5 h-3.5" /> New Booking
            </button>

          <div className="flex items-center gap-1.5 border border-natural-accent bg-natural-bg p-1 rounded-2xl shrink-0 self-end lg:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-natural-primary' : 'text-natural-muted hover:text-natural-dark'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'table' ? 'bg-white shadow-sm text-natural-primary' : 'text-natural-muted hover:text-natural-dark'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase font-bold text-natural-muted tracking-widest ml-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-natural-bg/60 border border-natural-accent rounded-2xl px-3 py-2.5 text-xs font-bold text-natural-dark outline-none focus:ring-1 focus:ring-natural-primary cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="payment_review">Payment Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase font-bold text-natural-muted tracking-widest ml-1">Property</label>
            <select
              value={hotelFilter}
              onChange={(e) => setHotelFilter(e.target.value)}
              className="bg-natural-bg/60 border border-natural-accent rounded-2xl px-3 py-2.5 text-xs font-bold text-natural-dark outline-none focus:ring-1 focus:ring-natural-primary cursor-pointer max-w-[200px]"
            >
              <option value="all">All properties</option>
              {hotels.map((h: Hotel) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase font-bold text-natural-muted tracking-widest ml-1">Check-in from</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-natural-bg/60 border border-natural-accent rounded-2xl px-3 py-2 text-xs font-bold text-natural-dark outline-none focus:ring-1 focus:ring-natural-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase font-bold text-natural-muted tracking-widest ml-1">Check-in to</label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-natural-bg/60 border border-natural-accent rounded-2xl px-3 py-2 text-xs font-bold text-natural-dark outline-none focus:ring-1 focus:ring-natural-primary"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setHotelFilter('all'); setFromDate(''); setToDate(''); }}
              className="px-4 py-2.5 rounded-2xl border border-natural-accent text-natural-dark hover:bg-natural-bg transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2. Loading + empty states */}
      {loading && items.length === 0 && (
        <div className="space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-natural-accent/20 animate-pulse rounded-[32px]" />)}
        </div>
      )}

      {!loading && total === 0 && !hasActiveFilters && (
        <div className="bg-white p-12 md:p-20 rounded-[32px] md:rounded-[40px] text-center border-2 border-dashed border-natural-accent">
          <p className="font-serif italic text-xl md:text-2xl text-natural-muted">No {type === 'past' ? 'past or cancelled' : 'active or upcoming'} reservations found.</p>
        </div>
      )}

      {!loading && total === 0 && hasActiveFilters && (
        <div className="bg-white p-12 md:p-20 rounded-[32px] md:rounded-[40px] text-center border-2 border-dashed border-natural-accent flex flex-col items-center gap-4">
          <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
            <Search className="w-8 h-8 text-natural-muted" />
          </div>
          <div>
            <h4 className="font-serif italic text-lg text-neutral-800 font-bold">No Bookings Found</h4>
            <p className="text-xs text-natural-muted max-w-sm mt-1 leading-relaxed">
              No reservations match your current filters. Try adjusting or clearing them.
            </p>
          </div>
        </div>
      )}

      {/* 3. Paginated View (Table or Grid based on viewMode) */}
      {items.length > 0 && (
        <>
          {viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white border border-natural-accent rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-natural-accent bg-natural-bg/40">
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Booking ID</th>
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Guest</th>
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Accommodation</th>
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest font-sans">Stay Period</th>
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Guests & Rooms</th>
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Amount</th>
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Status</th>
                      <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-accent">
                    {paginatedBookings.map((booking: Booking) => {
                      const room = rooms.find((r: any) => r.id === booking.roomId);
                      const hotel = hotels.find((h: any) => h.id === booking.hotelId);
                      
                      return (
                        <tr 
                          key={booking.id} 
                          onClick={() => setSelectedBooking(booking)}
                          className="hover:bg-natural-bg/10 cursor-pointer transition-colors"
                        >
                          <td className="py-5 px-6 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-mono font-bold text-natural-dark">#{booking.id.slice(0, 8).toUpperCase()}</span>
                              <span className="text-[10px] text-natural-muted">{new Date(booking.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-natural-dark">{booking.fullName}</span>
                              <span className="text-[10px] text-natural-muted truncate max-w-[150px]">{booking.email}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col mr-2">
                              <span className="text-xs font-bold text-natural-dark">{room?.name || 'Loading room...'}</span>
                              <span className="text-[10px] text-natural-muted font-bold uppercase tracking-wider">{hotel?.name || 'Loading hotel...'}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 whitespace-nowrap text-xs font-medium text-natural-dark">
                            {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
                          </td>
                          <td className="py-5 px-6 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-natural-dark">{booking.guests} Guests</span>
                              <span className="text-[10px] text-natural-muted font-mono">{booking.roomCount || 1} Room{(booking.roomCount || 1) > 1 ? 's' : ''}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 whitespace-nowrap text-xs font-bold text-natural-primary">
                            LKR {((room?.price || 0) * (booking.roomCount || 1)).toLocaleString()}
                          </td>
                          <td className="py-5 px-6 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-[8px] uppercase font-bold tracking-widest rounded-full border ${
                              booking.status === 'confirmed'
                                ? 'bg-green-50 text-green-700 border-green-100'
                                : booking.status === 'cancelled'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : booking.status === 'payment_review'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {booking.status === 'payment_review' ? 'Payment Review' : booking.status}
                            </span>
                          </td>
                          <td className="py-5 px-6 whitespace-nowrap text-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(booking);
                              }}
                              className="px-3.5 py-1.5 border border-natural-accent hover:border-natural-primary hover:bg-natural-primary hover:text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all bg-white"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedBookings.map((booking: Booking) => {
                const room = rooms.find((r: any) => r.id === booking.roomId);
                const hotel = hotels.find((h: any) => h.id === booking.hotelId);
                const isUnread = type === 'active' && alertIdSet.has(booking.id) && !seenBookingIds.includes(booking.id);

                return (
                  <motion.div 
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className={`bg-white rounded-[32px] border relative flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-xl transition-all group ${
                      isUnread 
                        ? 'border-amber-300 shadow-md ring-1 ring-amber-200 bg-amber-50/10' 
                        : 'border-natural-accent'
                    }`}
                  >
                    {isUnread && (
                      <div className="absolute top-4 left-4 z-10 bg-amber-500 text-white font-bold text-[8px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                        <span className="w-1.5 h-1.5 bg-white rounded-full inline-block animate-ping" />
                        New Alert
                      </div>
                    )}
                    
                    <div className="h-44 bg-natural-accent relative overflow-hidden shrink-0">
                      <img 
                        src={room?.imageUrl || undefined} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        alt={room?.name}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      
                      <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest block shadow-lg ${
                          booking.status === 'confirmed'
                            ? 'bg-green-600 text-white'
                            : booking.status === 'cancelled'
                            ? 'bg-red-600 text-white'
                            : booking.status === 'payment_review'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          {booking.status === 'payment_review' ? 'Payment Review' : booking.status}
                        </span>
                        
                        <span className="text-[10px] text-white font-mono font-bold uppercase tracking-wider backdrop-blur-md bg-black/40 px-3 py-1 rounded-lg">
                          Qty: {booking.roomCount || 1}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-bold text-natural-dark text-base md:text-lg line-clamp-1 group-hover:text-natural-primary transition-colors">{booking.fullName}</h3>
                          <p className="text-xs text-natural-muted font-medium mt-0.5 line-clamp-1">{hotel?.name} — {room?.name}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-natural-accent/50">
                          <div>
                            <p className="text-[9px] uppercase font-bold text-natural-muted tracking-widest mb-0.5">Check In</p>
                            <p className="text-xs font-bold text-natural-dark">{new Date(booking.checkIn).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase font-bold text-natural-muted tracking-widest mb-0.5">Check Out</p>
                            <p className="text-xs font-bold text-natural-dark">{new Date(booking.checkOut).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-natural-accent/40 text-xs">
                        <div className="text-natural-muted font-bold uppercase text-[9px] tracking-wider shrink-0">
                          {booking.guests} Guests
                        </div>
                        <div className="text-natural-primary font-bold tracking-tight text-right">
                          LKR {((room?.price || 0) * (booking.roomCount || 1)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* 4. Pagination Navigation Bar (server-side; bounded page window) */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-natural-accent border-dashed">
              <p className="text-xs text-natural-muted font-medium">
                Showing <span className="font-bold text-natural-dark">{((page - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-natural-dark">{Math.min(page * itemsPerPage, total)}</span> of <span className="font-bold text-natural-dark">{total}</span> bookings
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 border border-natural-accent bg-white rounded-full text-xs font-bold uppercase tracking-wider text-natural-dark hover:bg-natural-bg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {(() => {
                    const windowSize = 5;
                    let start = Math.max(1, page - 2);
                    const end = Math.min(totalPages, start + windowSize - 1);
                    start = Math.max(1, end - windowSize + 1);
                    const nums = [];
                    for (let p = start; p <= end; p++) nums.push(p);
                    return nums.map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                          page === pageNum
                            ? 'bg-natural-primary text-white shadow-md'
                            : 'border border-natural-accent bg-white text-natural-dark hover:bg-natural-bg'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ));
                  })()}
                </div>

                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages || loading}
                  className="px-4 py-2 border border-natural-accent bg-white rounded-full text-xs font-bold uppercase tracking-wider text-natural-dark hover:bg-natural-bg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

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
            onEdited={(updated: Booking) => {
              setSelectedBooking(updated);
              setRefreshKey(k => k + 1);
              onSuccess?.('Booking details updated.');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <CreateBookingModal
            hotels={hotels}
            rooms={rooms}
            onClose={() => setShowCreateModal(false)}
            onSuccess={(msg: string) => {
              onSuccess?.(msg);
              setRefreshKey(k => k + 1);
              onUpdate?.(true);
            }}
            onError={onError}
            onProcessing={onProcessing}
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

const AdminRoomsList = ({ rooms, setRooms, hotels, onEdit, onDelete, onUpdate, onSuccess, onError, onProcessing }: any) => {
  const toggleAvailability = async (room: Accommodation) => {
    const originalRooms = [...rooms];

    // Optimistically toggle availability state
    const updatedRooms = rooms.map((r: any) => {
      if (r.id === room.id) {
        return { ...r, isAvailable: !r.isAvailable };
      }
      return r;
    });
    setRooms(updatedRooms);

    onProcessing?.(room.isAvailable ? 'Marking as booked...' : 'Marking as available...');
    try {
      await dbService.updateRoom(room.id, { isAvailable: !room.isAvailable });
      onUpdate(true); // Silent refresh
      triggerDataRefresh();
      onSuccess?.(`Room ${room.isAvailable ? 'booked' : 'available'}`);
    } catch (e: any) {
      // Rollback style update on database update failure
      setRooms(originalRooms);
      onError?.(e.message || 'Failed to update availability');
    }
  }
  return (
    <div className="bg-white rounded-[32px] overflow-hidden border border-natural-accent">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left">
          <thead>
            <tr className="border-b border-natural-accent">
              <th className="px-8 py-6 text-[10px] uppercase font-bold text-natural-muted tracking-[0.2em]">Room Detail</th>
              <th className="px-8 py-6 text-[10px] uppercase font-bold text-natural-muted tracking-[0.2em]">Status</th>
              <th className="px-8 py-6 text-[10px] uppercase font-bold text-natural-muted tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-natural-accent">
            {rooms.filter((room: Accommodation) => {
              const matchingHotel = hotels?.find((h: any) => h.id === room.hotelId);
              return !matchingHotel || matchingHotel.type === 'Hotel' || matchingHotel.type === undefined;
            }).map((room: Accommodation) => (
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
    </div>
  );
};

const HotelForm = ({ hotel, rooms = [], onClose, onSuccess, onError, onProcessing }: any) => {
  const [tempId] = useState(() => generateUUID());
  const isSavedRef = useRef(false);

  // Find linked room details if this is editing an existing Villa or Bungalow
  const linkedRoom = hotel ? rooms.find((r: any) => r.hotelId === hotel.id) : null;
  
  // Extract number of bedrooms from amenities if previously saved, e.g. "3 Bedrooms"
  const getInitialBedrooms = () => {
    if (!linkedRoom || !linkedRoom.amenities) return 1;
    const bedroomsAsset = linkedRoom.amenities.find((a: string) => a.toLowerCase().includes('bedroom'));
    if (bedroomsAsset) {
      const match = bedroomsAsset.match(/\d+/);
      return match ? parseInt(match[0]) : 1;
    }
    return 1;
  };

  // Filter out the bedrooms tag from other amenities to avoid duplicating it
  const getInitialAmenities = () => {
    if (!linkedRoom || !linkedRoom.amenities) return '';
    return linkedRoom.amenities
      .filter((a: string) => !a.toLowerCase().includes('bedroom'))
      .join(', ');
  };

  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    type: hotel?.type || 'Hotel',
    location: hotel?.location || '',
    description: hotel?.description || '',
    imageUrl: hotel?.imageUrl || '',
    hasBanquetHall: hotel?.hasBanquetHall || false,
    email: hotel?.email || '',
    phone: hotel?.phone || '',
    // Villa & Bungalow specific fields:
    price: linkedRoom?.price || 0,
    maxGuests: linkedRoom?.maxGuests || 2,
    bedroomsCount: getInitialBedrooms(),
    amenities: getInitialAmenities()
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up uploaded temp media if we exit without saving the new hotel
      if (!hotel && !isSavedRef.current) {
        dbService.deleteMediaByParent(tempId).catch(console.error);
      }
    };
  }, [tempId, hotel]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isCloudinaryConfigured) {
      alert('Image hosting is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }
    setUploadingCover(true);
    try {
      const { url } = await uploadToCloudinary(file, { folder: 'covers' });
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    onProcessing?.(hotel ? 'Updating stay profile...' : 'Adding new stay...');
    try {
      const hotelPayload = {
        name: formData.name,
        location: formData.location,
        description: formData.description,
        imageUrl: formData.imageUrl,
        hasBanquetHall: formData.hasBanquetHall,
        email: formData.email,
        phone: formData.phone,
        type: formData.type
      };

      let stayId = hotel?.id;

      if (hotel) {
        await dbService.updateHotel(hotel.id, hotelPayload);
      } else {
        stayId = await dbService.addHotel(hotelPayload);
        isSavedRef.current = true;
        await dbService.reparentMedia(tempId, stayId);
      }

      // If it's a Villa or Bungalow, synchronize the corresponding bookable Room entity
      if (formData.type === 'Villa' || formData.type === 'Bungalow') {
        const associatedRoom = rooms.find((r: any) => r.hotelId === stayId);
        
        // Build beautiful amenities list including the Bedroom count and standard assets
        const customAmenities: string[] = [];
        customAmenities.push(`${formData.bedroomsCount} Bedroom${formData.bedroomsCount > 1 ? 's' : ''}`);
        
        if (formData.amenities) {
          formData.amenities.split(',').forEach((a: string) => {
            const trimmed = a.trim();
            if (trimmed) customAmenities.push(trimmed);
          });
        }

        const roomPayload = {
          hotelId: stayId!,
          name: formData.name,
          type: formData.type as any, // 'Villa' or 'Bungalow' or 'Suite' or 'Room'
          price: Number(formData.price),
          maxGuests: Number(formData.maxGuests),
          description: formData.description,
          imageUrl: formData.imageUrl,
          amenities: customAmenities,
          rating: 5,
          isAvailable: associatedRoom ? associatedRoom.isAvailable : true,
          quantity: 1, // Single-booking unit
          location: formData.location
        };

        if (associatedRoom) {
          await dbService.updateRoom(associatedRoom.id, roomPayload);
        } else {
          await dbService.addRoom(roomPayload);
        }
      }

      onSuccess(hotel ? 'Stay profile updated' : 'New stay profile registered');
    } catch (err: any) {
      onError?.(err.message || 'Failed to save stay profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={hotel ? 'Edit Stay' : 'Add New Stay'}>
      <form onSubmit={handleSubmit} className="space-y-6 select-none bg-natural-cream">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Property Name" 
            value={formData.name} 
            onChange={(v:any) => setFormData({...formData, name: v})} 
            required 
            placeholder="e.g. Whispering Palms"
          />
          <div className="space-y-2">
            <SectionLabel label="Property Type" />
            <select 
              className="w-full bg-white border border-natural-accent rounded-full p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark text-xs appearance-none" 
              value={formData.type} 
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="Hotel">Hotel</option>
              <option value="Villa">Villa (Whole Property Booking)</option>
              <option value="Bungalow">Bungalow (Whole Property Booking)</option>
            </select>
          </div>
        </div>

        <Input 
          label="Location" 
          value={formData.location} 
          onChange={(v:any) => setFormData({...formData, location: v})} 
          required 
          placeholder="e.g. Ambalangoda, Sri Lanka"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Contact Email" type="email" value={formData.email} onChange={(v:any) => setFormData({...formData, email: v})} />
          <Input label="Contact Phone" value={formData.phone} onChange={(v:any) => setFormData({...formData, phone: v})} />
        </div>

        {/* Villa & Bungalow Specific Configuration */}
        {(formData.type === 'Villa' || formData.type === 'Bungalow') && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border-2 border-dashed border-natural-accent bg-natural-bg/40 p-6 rounded-[24px] space-y-6"
          >
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-natural-primary font-mono select-none">
              {formData.type} Asset Configuration
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input 
                label="Price per Night (LKR)"
                type="number" 
                value={formData.price} 
                onChange={(v:any) => setFormData({...formData, price: v})} 
                required 
              />
              <Input 
                label="Number of Bedrooms" 
                type="number" 
                value={formData.bedroomsCount} 
                onChange={(v:any) => setFormData({...formData, bedroomsCount: v})} 
                required 
              />
              <Input 
                label="Max Guest Capacity" 
                type="number" 
                value={formData.maxGuests} 
                onChange={(v:any) => setFormData({...formData, maxGuests: v})} 
                required 
              />
            </div>

            <div className="space-y-2">
              <SectionLabel label="Included Assets & Amenities (Comma separated)" />
              <input 
                className="w-full bg-white border border-natural-accent rounded-full p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark text-xs" 
                value={formData.amenities} 
                onChange={e => setFormData({...formData, amenities: e.target.value})}
                placeholder="e.g. Private Pool, Ocean View, Butler Service, High Speed Wi-Fi"
              />
            </div>
          </motion.div>
        )}

        <div className="flex items-center gap-3 p-4 bg-natural-bg rounded-2xl border border-natural-accent">
          <input 
            type="checkbox" 
            id="hasBanquetHall"
            checked={formData.hasBanquetHall} 
            onChange={e => setFormData({...formData, hasBanquetHall: e.target.checked})}
            className="w-5 h-5 accent-natural-primary cursor-pointer"
          />
          <label htmlFor="hasBanquetHall" className="text-sm font-semibold text-natural-dark cursor-pointer">Includes Banquet Hall (for weddings & events)</label>
        </div>

        {/* Cover Photo Upload Area */}
        <div className="space-y-2 pt-4 border-t border-natural-accent">
          <SectionLabel label="Cover Photo" />
          {formData.imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-natural-accent aspect-video bg-natural-bg">
              <img src={formData.imageUrl} className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => setFormData({...formData, imageUrl: ''})}
                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow transition-all flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className={`border-2 border-dashed border-natural-accent rounded-2xl py-6 p-4 flex flex-col items-center justify-center cursor-pointer hover:border-natural-primary hover:bg-natural-bg transition-all max-w-sm w-full ${uploadingCover ? 'opacity-50 pointer-events-none' : ''}`}>
              <Camera className="w-6 h-6 text-natural-muted mb-1.5" />
              <span className="text-[10px] font-bold text-natural-dark uppercase tracking-widest font-mono">Upload Main Image</span>
              <span className="text-[9px] text-natural-muted mt-0.5 select-none">PNG, JPG files up to 5MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          )}
        </div>

        {/* Image Gallery Upload (Multiple pictures) */}
        <div className="pt-6 border-t border-natural-accent">
          <ImageGalleryUpload parentId={hotel ? hotel.id : tempId} parentType="hotel" />
        </div>

        <div className="pt-6 border-t border-natural-accent space-y-2">
          <SectionLabel label="Stay Description" />
          <textarea 
            className="w-full bg-white border border-natural-accent rounded-3xl p-4 min-h-[120px] outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark placeholder:text-natural-muted/60 text-xs" 
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            placeholder="Describe this property's unique character and atmosphere..."
          />
        </div>
        <button 
          disabled={isSaving || uploadingCover}
          type="submit" 
          className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[11px] shadow-xl hover:bg-natural-dark transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : hotel ? 'Save Stay Profile' : 'Publish Stay Profile'}
        </button>
      </form>
    </Modal>
  );
};

const RoomForm = ({ room, hotels, onClose, onSuccess, onError, onProcessing }: any) => {
  const [tempId] = useState(() => generateUUID());
  const isSavedRef = useRef(false);

  const [formData, setFormData] = useState({
    hotelId: room?.hotelId || hotels.filter((h: any) => h.type === 'Hotel' || h.type === undefined)[0]?.id || '',
    name: room?.name || '',
    type: room?.type || 'Room',
    price: room?.price || 0,
    maxGuests: room?.maxGuests || 2,
    description: room?.description || '',
    imageUrl: room?.imageUrl || '',
    amenities: room?.amenities?.join(', ') || '',
    quantity: room?.quantity || 1,
    groupId: (room as any)?.groupId || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up uploaded temp media if we exit without saving the new room
      if (!room && !isSavedRef.current) {
        dbService.deleteMediaByParent(tempId).catch(console.error);
      }
    };
  }, [tempId, room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    onProcessing?.(room ? 'Updating room...' : 'Adding room...');
    try {
      const selectedProperty = hotels.find((h: any) => h.id === formData.hotelId);
      const payload = { 
        ...formData, 
        price: Number(formData.price), 
        maxGuests: Number(formData.maxGuests), 
        quantity: Number(formData.quantity || 1),
        imageUrl: formData.imageUrl || selectedProperty?.imageUrl || '',
        location: selectedProperty?.location || '',
        rating: room?.rating || 5,
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean),
        isAvailable: room ? room.isAvailable : true,
        groupId: formData.groupId.trim() || null,
      };
      if (room) {
        await dbService.updateRoom(room.id, payload);
      } else {
        const newId = await dbService.addRoom(payload);
        isSavedRef.current = true;
        await dbService.reparentMedia(tempId, newId);
      }
      onSuccess(room ? 'Room details saved' : 'New room added');
    } catch (err: any) {
      onError?.(err.message || 'Failed to save room');
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Modal onClose={onClose} title={room ? 'Edit Room' : 'Add New Room'}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <SectionLabel label="Select Property" />
          <select 
            className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark" 
            value={formData.hotelId} 
            onChange={e => setFormData({...formData, hotelId: e.target.value})}
          >
            {hotels.filter((h: any) => h.type === 'Hotel' || h.type === undefined).map((h: Hotel) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        
        <Input label="Room Name / Title" value={formData.name} onChange={(v:any) => setFormData({...formData, name: v})} required placeholder="e.g. Presidential Water Villa" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input label="Price/Night (LKR)" type="number" value={formData.price} onChange={(v:any) => setFormData({...formData, price: v})} required />
          <Input label="Max Guests" type="number" value={formData.maxGuests} onChange={(v:any) => setFormData({...formData, maxGuests: v})} required />
          <Input label="Quantity (Supply)" type="number" value={formData.quantity} onChange={(v:any) => setFormData({...formData, quantity: v})} required min="1" />
        </div>
        
        <div className="space-y-4">
          <SectionLabel label="Amenities (Comma separated)" />
          <input
            className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark"
            value={formData.amenities}
            onChange={e => setFormData({...formData, amenities: e.target.value})}
            placeholder="e.g. Private Pool, Wi-Fi, Ocean View"
          />
        </div>

        <div className="space-y-2">
          <SectionLabel label="Villa Group Tag (optional)" />
          <input
            className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark"
            value={formData.groupId}
            onChange={e => setFormData({...formData, groupId: e.target.value})}
            placeholder="e.g. blue-wave-villa — rooms sharing this tag block each other"
          />
          <p className="text-[10px] text-natural-muted px-1">Rooms with the same tag become mutually exclusive: booking any one blocks all others for those dates. Leave blank for independent rooms.</p>
        </div>

        <div className="space-y-4">
          <SectionLabel label="Room Description" />
          <textarea 
            className="w-full bg-white border border-natural-accent rounded-2xl p-4 min-h-[120px] outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark" 
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            placeholder="Describe the room experience..." 
          />
        </div>
        
        <div className="pt-6 border-t border-natural-accent">
          <ImageGalleryUpload parentId={room ? room.id : tempId} parentType="room" />
        </div>
        
        <button type="submit" className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[11px] shadow-xl hover:bg-natural-dark transition-all active:scale-[0.98]">Save Room Details</button>
      </form>
    </Modal>
  );
};

// --- Missing subcomponents from original refactor ---

const BookingDetailsModal = ({ booking, hotels, rooms, onClose, showCancelDialog, setShowCancelDialog, cancelReason, setCancelReason, onStatusUpdate, onEdited }: any) => {
  const hotel = hotels.find((h: any) => h.id === booking.hotelId);
  const room = rooms.find((r: any) => r.id === booking.roomId);

  const [slipViewed, setSlipViewed] = useState(false);
  useEffect(() => { setSlipViewed(false); }, [booking.id]);
  const canConfirm = Boolean(booking.paymentSlipUrl) && slipViewed;

  // ── Edit mode ────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: booking.fullName || '',
    email: booking.email || '',
    phone: booking.phone || '',
    checkIn: booking.checkIn ? booking.checkIn.split('T')[0] : '',
    checkOut: booking.checkOut ? booking.checkOut.split('T')[0] : '',
    guests: booking.guests || 2,
    roomCount: booking.roomCount || 1,
    specialRequests: booking.specialRequests || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    setEditMode(false);
    setEditForm({
      fullName: booking.fullName || '',
      email: booking.email || '',
      phone: booking.phone || '',
      checkIn: booking.checkIn ? booking.checkIn.split('T')[0] : '',
      checkOut: booking.checkOut ? booking.checkOut.split('T')[0] : '',
      guests: booking.guests || 2,
      roomCount: booking.roomCount || 1,
      specialRequests: booking.specialRequests || '',
    });
    setEditError('');
  }, [booking.id]);

  const handleSaveEdit = async () => {
    if (!editForm.fullName || !editForm.email || !editForm.checkIn || !editForm.checkOut) {
      setEditError('Name, email, and dates are required.');
      return;
    }
    if (new Date(editForm.checkOut) <= new Date(editForm.checkIn)) {
      setEditError('Check-out must be after check-in.');
      return;
    }
    setIsSaving(true);
    setEditError('');
    try {
      const updated = await dbService.updateBooking(booking.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone || undefined,
        checkIn: editForm.checkIn,
        checkOut: editForm.checkOut,
        guests: Number(editForm.guests),
        roomCount: Number(editForm.roomCount),
        specialRequests: editForm.specialRequests || undefined,
      } as any);
      setEditMode(false);
      onEdited?.(updated);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const ef = (field: string, value: any) => setEditForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-natural-dark/40 backdrop-blur-sm" onClick={onClose} />
      {!showCancelDialog ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-3xl bg-natural-cream rounded-[40px] overflow-hidden flex flex-col max-h-[90vh]">
          <div className="overflow-y-auto flex-1">
            <div className="p-12">
              <div className="flex justify-between items-center mb-8 border-b border-natural-accent pb-6">
                <div>
                  <h3 className="font-serif text-3xl italic text-natural-dark">Reservation Details</h3>
                  <div className="flex gap-4 mt-1">
                    <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest">ID: {booking.id}</p>
                    <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest border-l border-natural-accent pl-4">Placed: {new Date(booking.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {booking.status !== 'cancelled' && !editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-natural-accent text-xs font-bold uppercase tracking-widest text-natural-dark hover:bg-natural-bg transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Details
                    </button>
                  )}
                  <button onClick={onClose} className="p-2 hover:bg-natural-bg rounded-full transition-colors"><XCircle className="w-8 h-8 text-natural-muted" /></button>
                </div>
              </div>

              {/* ── Edit mode form ──────────────────────────────────────── */}
              {editMode ? (
                <div className="space-y-5 mb-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Full Name *" value={editForm.fullName} onChange={(v: string) => ef('fullName', v)} />
                    <Input label="Email *" type="email" value={editForm.email} onChange={(v: string) => ef('email', v)} />
                    <Input label="Phone" value={editForm.phone} onChange={(v: string) => ef('phone', v)} />
                    <div className="space-y-2">
                      <SectionLabel label="Guests" />
                      <input type="number" min={1} max={20} value={editForm.guests} onChange={e => ef('guests', e.target.value)}
                        className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium" />
                    </div>
                    <div className="space-y-2">
                      <SectionLabel label="Check-in *" />
                      <input type="date" value={editForm.checkIn} onChange={e => ef('checkIn', e.target.value)}
                        className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium" />
                    </div>
                    <div className="space-y-2">
                      <SectionLabel label="Check-out *" />
                      <input type="date" value={editForm.checkOut} min={editForm.checkIn || undefined} onChange={e => ef('checkOut', e.target.value)}
                        className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium" />
                    </div>
                    <div className="space-y-2">
                      <SectionLabel label="Room Count" />
                      <input type="number" min={1} max={20} value={editForm.roomCount} onChange={e => ef('roomCount', e.target.value)}
                        className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <SectionLabel label="Special Requests" />
                    <textarea value={editForm.specialRequests} onChange={e => ef('specialRequests', e.target.value)} rows={3}
                      className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium resize-none" />
                  </div>
                  {editError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">{editError}</p>
                  )}
                  <div className="flex gap-4">
                    <button onClick={() => { setEditMode(false); setEditError(''); }}
                      className="flex-1 border border-natural-accent text-natural-dark py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-bg transition-all">
                      Cancel
                    </button>
                    <button onClick={handleSaveEdit} disabled={isSaving}
                      className="flex-1 bg-natural-primary text-white py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all disabled:opacity-50 shadow-lg shadow-natural-primary/20">
                      {isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (<>

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

              {/* Payment slip — verify the bank transfer before confirming */}
              {booking.status !== 'cancelled' && (
                <div className="mb-10">
                  <SectionLabel label="Payment Verification" />
                  {booking.paymentSlipUrl ? (
                    <div className="bg-natural-bg p-6 rounded-3xl mt-4 flex flex-col sm:flex-row sm:items-center gap-5">
                      <a href={booking.paymentSlipUrl} target="_blank" rel="noreferrer" onClick={() => setSlipViewed(true)} className="block w-full sm:w-40 h-40 rounded-2xl overflow-hidden bg-white border border-natural-accent shrink-0">
                        {/\.pdf($|\?)/i.test(booking.paymentSlipUrl) ? (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-natural-primary uppercase tracking-widest">View PDF</div>
                        ) : (
                          <img src={booking.paymentSlipUrl} className="w-full h-full object-cover" alt="Payment slip" />
                        )}
                      </a>
                      <div className="flex-1">
                        <p className="text-xs text-natural-muted leading-relaxed mb-2">
                          The guest has uploaded a bank-transfer slip. Open and review it to confirm the funds were received before accepting the reservation.
                        </p>
                        <a href={booking.paymentSlipUrl} target="_blank" rel="noreferrer" onClick={() => setSlipViewed(true)} className="text-[10px] font-bold uppercase tracking-widest text-natural-primary border-b border-natural-primary pb-0.5">
                          Open full slip
                        </a>
                        {slipViewed && (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mt-3 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Slip reviewed
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl mt-4">
                      <p className="text-xs text-amber-700 italic">No payment slip uploaded yet. The guest still needs to transfer and upload their slip — this reservation cannot be confirmed until a slip is received and reviewed.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-8 border-t border-natural-accent">
                {(booking.status === 'pending' || booking.status === 'payment_review') && (
                  <button
                    onClick={() => canConfirm && onStatusUpdate(booking.id, 'confirmed')}
                    disabled={!canConfirm}
                    title={!booking.paymentSlipUrl
                      ? 'A payment slip must be uploaded before confirming.'
                      : !slipViewed
                      ? 'Open and review the payment slip before confirming.'
                      : ''}
                    className="flex-1 bg-green-600 text-white py-5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-green-700 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                  >
                    {!booking.paymentSlipUrl
                      ? 'Awaiting Payment Slip'
                      : !slipViewed
                      ? 'Review Slip to Confirm'
                      : 'Verify & Confirm'}
                  </button>
                )}
                {booking.status === 'payment_review' && (
                  <button
                    onClick={() => onStatusUpdate(booking.id, 'pending')}
                    className="flex-1 bg-white border border-amber-200 text-amber-700 py-5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-amber-50 transition-all"
                  >
                    Reject Slip
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
              </>)}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 w-full max-w-md bg-natural-cream rounded-[40px] p-10 shadow-2xl">
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

// ── Admin creates a booking on behalf of a guest ─────────────────────────────
const CreateBookingModal = ({ hotels, rooms, onClose, onSuccess, onError, onProcessing }: any) => {
  const initialForm = () => ({
    hotelId: hotels.length === 1 ? hotels[0].id : '',
    roomId: '',
    fullName: '', email: '', phone: '',
    checkIn: '', checkOut: '',
    guests: 2, roomCount: 1,
    specialRequests: '',
    status: 'pending' as string,
    sendEmail: true,
  });
  const [form, setForm] = useState(initialForm());
  const [saving, setSaving] = useState(false);

  const filteredRooms = rooms.filter((r: Accommodation) =>
    !form.hotelId || r.hotelId === form.hotelId
  );

  const f = (field: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // When hotel changes, reset room selection
      if (field === 'hotelId') next.roomId = '';
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.roomId || !form.hotelId || !form.fullName || !form.email || !form.checkIn || !form.checkOut) {
      onError?.('Room, guest name, email, and dates are required.');
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      onError?.('Check-out must be after check-in.');
      return;
    }
    setSaving(true);
    onProcessing?.('Creating booking…');
    try {
      await dbService.createAdminBooking({
        roomId: form.roomId,
        hotelId: form.hotelId,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests) || 2,
        roomCount: Number(form.roomCount) || 1,
        specialRequests: form.specialRequests || undefined,
        status: form.status,
        sendEmail: form.sendEmail,
      });
      onSuccess?.('Booking created successfully.');
      onClose();
    } catch (err: any) {
      onError?.(err.message || 'Failed to create booking.');
    } finally {
      setSaving(false);
    }
  };

  const selectCls = 'w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark text-sm appearance-none cursor-pointer';
  const numCls = 'w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium';
  const dateCls = 'w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium';

  return (
    <Modal title="New Booking" onClose={onClose}>
      <div className="space-y-5">
        {/* Hotel + Room */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionLabel label="Hotel *" />
            <select value={form.hotelId} onChange={e => f('hotelId', e.target.value)} className={selectCls}>
              <option value="">Select hotel…</option>
              {hotels.map((h: Hotel) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <SectionLabel label="Room *" />
            <select value={form.roomId} onChange={e => f('roomId', e.target.value)} className={selectCls} disabled={!form.hotelId}>
              <option value="">Select room…</option>
              {filteredRooms.map((r: Accommodation) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionLabel label="Check-in *" />
            <input type="date" value={form.checkIn} onChange={e => f('checkIn', e.target.value)} className={dateCls} />
          </div>
          <div className="space-y-2">
            <SectionLabel label="Check-out *" />
            <input type="date" value={form.checkOut} min={form.checkIn || undefined} onChange={e => f('checkOut', e.target.value)} className={dateCls} />
          </div>
        </div>

        <hr className="border-natural-accent" />

        {/* Guest info */}
        <Input label="Guest Full Name *" value={form.fullName} onChange={(v: string) => f('fullName', v)} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Email *" type="email" value={form.email} onChange={(v: string) => f('email', v)} />
          <Input label="Phone" value={form.phone} onChange={(v: string) => f('phone', v)} placeholder="+94 …" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionLabel label="Guests" />
            <input type="number" min={1} max={50} value={form.guests} onChange={e => f('guests', e.target.value)} className={numCls} />
          </div>
          <div className="space-y-2">
            <SectionLabel label="Room Count" />
            <input type="number" min={1} max={20} value={form.roomCount} onChange={e => f('roomCount', e.target.value)} className={numCls} />
          </div>
        </div>
        <div className="space-y-2">
          <SectionLabel label="Special Requests" />
          <textarea value={form.specialRequests} onChange={e => f('specialRequests', e.target.value)} rows={2}
            className="w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 text-natural-dark font-medium resize-none" />
        </div>

        <hr className="border-natural-accent" />

        {/* Status & email */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionLabel label="Initial Status" />
            <select value={form.status} onChange={e => f('status', e.target.value)} className={selectCls}>
              <option value="pending">Pending (awaiting payment)</option>
              <option value="confirmed">Confirmed (payment received)</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-7">
            <button type="button" onClick={() => f('sendEmail', !form.sendEmail)}
              className={`relative rounded-full transition-colors duration-200 ${form.sendEmail ? 'bg-natural-primary' : 'bg-natural-accent'}`}
              style={{ width: 40, height: 22 }}>
              <span className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ width: 18, height: 18, transform: form.sendEmail ? 'translateX(18px)' : 'translateX(0)' }} />
            </button>
            <span className="text-xs font-bold text-natural-dark uppercase tracking-widest">
              {form.sendEmail ? 'Send confirmation email' : 'No email to guest'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-2">
          <button onClick={onClose}
            className="flex-1 border border-natural-accent text-natural-dark py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-bg transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-natural-primary text-white py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all disabled:opacity-50 shadow-lg shadow-natural-primary/20">
            {saving ? 'Creating…' : 'Create Booking'}
          </button>
        </div>
      </div>
    </Modal>
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
