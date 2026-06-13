import { useState, useMemo } from 'react';
import { FilterState } from '../types';
import { queryClient, queryKeys } from '../lib/queryClient';
import { useHotelsQuery, useRoomsQuery } from './queries';

export const useAccommodations = () => {
  const [filters, setFilters] = useState<FilterState>({
    type: 'All',
    priceRange: [0, 10000000],
    minRating: 0,
    location: 'All',
    checkIn: '',
    checkOut: '',
    hotelId: 'All',
  });

  const hotelsQuery = useHotelsQuery();
  const roomsQuery = useRoomsQuery();

  const hotels = hotelsQuery.data ?? [];
  const accommodations = roomsQuery.data ?? [];

  // First-paint loading vs. background re-fetch (e.g. after a mutation).
  const loading = hotelsQuery.isLoading || roomsQuery.isLoading;
  const refreshing = (hotelsQuery.isFetching || roomsQuery.isFetching) && !loading;
  const queryError = hotelsQuery.error || roomsQuery.error;
  const error = queryError ? (queryError as Error).message : null;

  const filteredItems = useMemo(() => {
    return accommodations.filter(item => {
      // Only show available rooms on the frontend
      if (item.isAvailable === false) return false;

      const matchesType = filters.type === 'All' || item.type === filters.type;
      const matchesPrice = item.price >= filters.priceRange[0] && item.price <= filters.priceRange[1];
      const matchesRating = item.rating >= filters.minRating;
      const itemLocation = item.location || hotels.find(h => h.id === item.hotelId)?.location || '';
      const matchesLocation = filters.location === 'All' || itemLocation.toLowerCase() === filters.location.toLowerCase();
      const matchesHotel = !filters.hotelId || filters.hotelId === 'All' || item.hotelId === filters.hotelId;

      return matchesType && matchesPrice && matchesRating && matchesLocation && matchesHotel;
    });
  }, [accommodations, hotels, filters]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.hotels });
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
  };

  return {
    hotels,
    accommodations,
    bookings: [],
    loading,
    refreshing,
    error,
    filters,
    filteredItems,
    setFilters,
    refresh,
  };
};
