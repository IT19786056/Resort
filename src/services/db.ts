import { Hotel, Accommodation, Booking, CustomerProfile, AdminProfile, AdminLog } from '../types';

let adminContext: { id: string; email: string; displayName?: string; role: 'admin' | 'staff' } | null = null;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Use fully qualified paths for same-origin API calls to ensure
  // compatibility with iframe and sandbox environments.
  let url = path;
  if (!path.startsWith('http')) {
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:3000';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    url = `${origin}${cleanPath}`;
  }
  
  const reqHeaders = new Headers(options?.headers || {});
  reqHeaders.set('Content-Type', 'application/json');

  // Attach the signed session JWT so the server can verify identity/role
  // (the x-admin-* headers below are display hints only and are NOT trusted
  // for authorization on the backend).
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('amadiya_customer_token');
    if (token) {
      reqHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  if (adminContext) {
    reqHeaders.set('x-admin-id', adminContext.id);
    reqHeaders.set('x-admin-email', adminContext.email);
    reqHeaders.set('x-admin-name', adminContext.displayName || '');
    reqHeaders.set('x-admin-role', adminContext.role);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: reqHeaders,
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
  async getHotels(refresh?: boolean) {
    const url = refresh ? '/api/hotels?refresh=true' : '/api/hotels';
    return apiFetch<Hotel[]>(url);
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
  async getRooms(hotelId?: string, refresh?: boolean) {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', hotelId);
    if (refresh) params.append('refresh', 'true');
    const url = params.toString() ? `/api/rooms?${params.toString()}` : '/api/rooms';
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

  async getRoomAvailability(id: string, checkIn: string, checkOut: string) {
    return apiFetch<{ remainingQuantity: number }>(`/api/rooms/${id}/availability?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`);
  },

  // Remaining units per room for a date range: { [roomId]: remainingQuantity }.
  async getBatchAvailability(checkIn: string, checkOut: string) {
    return apiFetch<Record<string, number>>(`/api/availability?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`);
  },

  // Bookings
  async getBookings(limit?: number, offset?: number) {
    let url = '/api/bookings';
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (params.toString()) url += `?${params.toString()}`;
    return apiFetch<Booking[]>(url);
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

  async uploadPaymentSlip(id: string, slipUrl: string) {
    return apiFetch<Booking>(`/api/bookings/${id}/slip`, {
      method: 'POST',
      body: JSON.stringify({ slipUrl }),
    });
  },

  // Media
  async getMedia(parentId: string) {
    return apiFetch<any[]>(`/api/media/${parentId}`);
  },

  async addMedia(media: { parentId: string; parentType: string; data: string; order?: number }) {
    return apiFetch<any>('/api/media', {
      method: 'POST',
      body: JSON.stringify(media),
    });
  },

  async reparentMedia(oldParentId: string, newParentId: string) {
    return apiFetch<any>('/api/media/reparent', {
      method: 'POST',
      body: JSON.stringify({ oldParentId, newParentId }),
    });
  },

  async deleteMediaByParent(parentId: string) {
    return apiFetch<void>(`/api/media/parent/${parentId}`, { method: 'DELETE' });
  },

  async deleteMedia(id: string) {
    return apiFetch<void>(`/api/media/${id}`, { method: 'DELETE' });
  },

  // Seed data is now handled by the backend
  async seedData() {
    console.log('Seed data is now handled by the backend server initialization.');
  },

  setAdminContext(context: typeof adminContext) {
    adminContext = context;
  },

  async getAdminLogs() {
    return apiFetch<AdminLog[]>('/api/admin/logs');
  },

  async sendAdminOtp(email: string) {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/send-admin-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async verifyAdminOtp(payload: { email: string; otp: string; role: 'admin' | 'staff' }) {
    return apiFetch<{ success: boolean; tempPassword?: string; message: string }>('/api/auth/verify-admin-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async changeAdminPassword(payload: { email: string; currentPassword: string; newPassword: string }) {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/change-admin-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
