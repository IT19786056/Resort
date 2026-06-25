// Top-level page tabs the storefront can show. Drives the Navbar, Footer and
// the AnimatePresence switch in App.tsx — keep all three in sync.
export type TabId =
  | 'home'
  | 'accommodation'
  | 'experiences'
  | 'gallery'
  | 'explore-locations'
  | 'about'
  | 'contact'
  | 'my-bookings'
  | 'staff';

export interface Hotel {
  id: string;
  name: string;
  location: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  hasBanquetHall: boolean;
  email?: string;
  phone?: string;
  type?: 'Hotel' | 'Villa' | 'Bungalow';
}

export interface Accommodation {
  id: string;
  hotelId: string;
  name: string;
  type: 'Villa' | 'Suite' | 'Room';
  location: string;
  description: string;
  price: number;
  rating: number;
  imageUrl: string;
  images?: string[];
  amenities: string[];
  maxGuests: number;
  isAvailable?: boolean;
  manualStopSell?: boolean;
  quantity?: number;
}

export interface Booking {
  id: string;
  roomId: string;
  hotelId: string;
  userId?: string; // Added to track which user made the booking
  fullName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  status: 'pending' | 'payment_review' | 'confirmed' | 'cancelled';
  cancellationReason?: string;
  createdAt: string;
  roomCount?: number;
  paymentSlipUrl?: string; // Cloudinary URL of the uploaded bank transfer slip
  paidAt?: string; // Set when staff verify the payment and confirm the booking
}

export interface CustomerProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  role: 'admin' | 'staff' | 'superadmin';
  displayName?: string;
  createdAt: string;
  requiresPasswordChange?: boolean;
}

export interface Tenant {
  id: string;
  domain: string;
  hotelId: string;
  hotelName?: string;
  name: string;
  logoUrl?: string | null;
  markLogoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  phone?: string | null;
  email?: string | null;
  emailFrom?: string | null;
  bankDetails?: Record<string, string> | null;
  smtpConfig?: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminSummary {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
  hotelId: string | null;
  hotelName?: string | null;
  createdAt: string;
}

export interface FilterState {
  type: string | 'All';
  priceRange: [number, number];
  minRating: number;
  location: string;
  checkIn: string;
  checkOut: string;
  hotelId?: string;
}

export interface CartItem {
  id: string;
  accommodation: Accommodation;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomCount: number;
}

export interface AdminLog {
  id: string;
  adminId: string | null;
  adminEmail: string;
  adminName: string | null;
  action: string;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

// Admin occupancy calendar — one entry per night of the requested window.
export interface CalendarDay {
  date: string;      // YYYY-MM-DD, the night being represented
  booked: number;    // units sold that night (non-cancelled bookings)
  available: number; // units still bookable that night
  stopped: boolean;  // staff stop-sell closes this night for the room
}

// A staff-applied close-out over a date range for one room. Half-open:
// nights in [fromDate, toDate) are closed (same convention as a booking stay).
export interface StopSell {
  id: string;
  roomId: string;
  fromDate: string;  // YYYY-MM-DD, inclusive first closed night
  toDate: string;    // YYYY-MM-DD, exclusive end
  reason?: string;
  createdAt: string;
}

// Per-room availability across a date window, used by the admin calendar grid.
export interface RoomCalendar {
  roomId: string;
  name: string;
  hotelId: string;
  quantity: number;
  manualStopSell: boolean;
  days: CalendarDay[];
}

