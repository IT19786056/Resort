import { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { Hotel, Accommodation, Booking, FilterState } from '../types';

export const useAccommodations = () => {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: 'All',
    priceRange: [0, 5000],
    minRating: 0,
    location: 'All',
    checkIn: '',
    checkOut: '',
  });

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [h, r] = await Promise.all([
        dbService.getHotels(),
        dbService.getRooms()
      ]);
      setHotels(h || []);
      setAccommodations(r || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    return accommodations.filter(item => {
      // Only show available rooms on the frontend
      if (item.isAvailable === false) return false;

      const matchesType = filters.type === 'All' || item.type === filters.type;
      const matchesPrice = item.price >= filters.priceRange[0] && item.price <= filters.priceRange[1];
      const matchesRating = item.rating >= filters.minRating;
      const matchesLocation = filters.location === 'All' || item.location === filters.location;
      
      // Basic check: if checkIn/checkOut is set, find if there are conflicting reservations
      const matchesAvailability = true; // For now simplified, could check against 'bookings'
      
      return matchesType && matchesPrice && matchesRating && matchesLocation && matchesAvailability;
    });
  }, [accommodations, filters]);

  return {
    hotels,
    accommodations,
    bookings,
    loading,
    refreshing,
    error,
    filters,
    filteredItems,
    setFilters,
    refresh: () => fetchData(true)
  };
};
