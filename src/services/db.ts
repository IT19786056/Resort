import { Hotel, Accommodation, Booking, CustomerProfile, AdminProfile } from '../types';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Use relative paths for same-origin API calls. 
  // We ensure it starts with / but not // (which would be interpreted as protocol-blind absolute URL)
  let url = path;
  if (!path.startsWith('http')) {
    url = path.startsWith('/') ? path : `/${path}`;
  }
  
  try {
    const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = 'API Request failed';
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || errorMessage;
    } catch (e) {
      console.error('Non-JSON error response:', text);
      errorMessage = `Server Error: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
  } catch (error: any) {
    console.error(`Fetch error for ${url}:`, error);
    throw new Error(error.message || 'Network error or Invalid URL');
  }
}

export const dbService = {
  // Customer Profiles
  async getCustomers() {
    return apiFetch<CustomerProfile[]>('/api/customers');
  },

  async getCustomerProfile(uid: string) {
    return apiFetch<CustomerProfile | null>(`/api/customers/${uid}`);
  },

  async saveCustomerProfile(uid: string, profile: Omit<CustomerProfile, 'id'>) {
    return apiFetch<CustomerProfile>(`/api/customers/${uid}`, {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  // Admin Profiles
  async getAdmins() {
    return apiFetch<AdminProfile[]>('/api/admins');
  },

  async getAdminProfile(uid: string) {
    return apiFetch<AdminProfile | null>(`/api/admins/${uid}`);
  },

  async saveAdminProfile(uid: string, profile: Omit<AdminProfile, 'id'>) {
    return apiFetch<AdminProfile>(`/api/admins/${uid}`, {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  async deleteAdmin(id: string) {
    return apiFetch<void>(`/api/admins/${id}`, { method: 'DELETE' });
  },

  // Hotels
  async getHotels() {
    return apiFetch<Hotel[]>('/api/hotels');
  },

  async addHotel(hotel: Omit<Hotel, 'id'>) {
    const result = await apiFetch<Hotel>('/api/hotels', {
      method: 'POST',
      body: JSON.stringify(hotel),
    });
    return result.id;
  },

  async updateHotel(id: string, hotel: Partial<Hotel>) {
    return apiFetch<Hotel>(`/api/hotels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(hotel),
    });
  },

  async deleteHotel(id: string) {
    return apiFetch<void>(`/api/hotels/${id}`, { method: 'DELETE' });
  },

  // Rooms
  async getRooms(hotelId?: string) {
    const url = hotelId ? `/api/rooms?hotelId=${hotelId}` : '/api/rooms';
    return apiFetch<Accommodation[]>(url);
  },

  async addRoom(room: Omit<Accommodation, 'id'>) {
    const result = await apiFetch<Accommodation>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(room),
    });
    return result.id;
  },

  async updateRoom(id: string, room: Partial<Accommodation>) {
    return apiFetch<Accommodation>(`/api/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(room),
    });
  },

  async deleteRoom(id: string) {
    return apiFetch<void>(`/api/rooms/${id}`, { method: 'DELETE' });
  },

  // Bookings
  async getBookings() {
    return apiFetch<Booking[]>('/api/bookings');
  },

  async getUserBookings(userId: string) {
    return apiFetch<Booking[]>(`/api/bookings?userId=${userId}`);
  },

  async addBooking(booking: Omit<Booking, 'id'>) {
    const result = await apiFetch<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
    return result.id;
  },

  async updateBooking(id: string, data: Partial<Booking>) {
    return apiFetch<Booking>(`/api/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Seed data is now handled by the backend
  async seedData() {
    console.log('Seed data is now handled by the backend server initialization.');
  }
};
