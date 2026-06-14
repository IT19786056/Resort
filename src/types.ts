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
  role: 'admin' | 'staff';
  displayName?: string;
  createdAt: string;
  requiresPasswordChange?: boolean;
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

