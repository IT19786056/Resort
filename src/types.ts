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
  amenities: string[];
  maxGuests: number;
  isAvailable?: boolean;
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
  status: 'pending' | 'confirmed' | 'cancelled';
  cancellationReason?: string;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  displayName?: string;
  createdAt: string;
}

export interface FilterState {
  type: string | 'All';
  priceRange: [number, number];
  minRating: number;
  location: string;
  checkIn: string;
  checkOut: string;
}
