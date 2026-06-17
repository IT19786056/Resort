import { useState, useMemo } from 'react';
import { FilterState } from '../types';
import { queryClient, queryKeys } from '../lib/queryClient';
import { useHotelsQuery, useRoomsQuery, useAvailabilityQuery } from './queries';

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

  // Date-aware availability: only fetched once BOTH dates are chosen.
  const datesSelected = !!filters.checkIn && !!filters.checkOut;
  const availabilityQuery = useAvailabilityQuery(
    datesSelected ? filters.checkIn : undefined,
    datesSelected ? filters.checkOut : undefined,
  );
  const availabilityMap = availabilityQuery.data;

  // First-paint loading vs. background re-fetch (e.g. after a mutation).
  const loading = hotelsQuery.isLoading || roomsQuery.isLoading;
  const refreshing =
    ((hotelsQuery.isFetching || roomsQuery.isFetching) && !loading) ||
    (datesSelected && availabilityQuery.isFetching);
  const queryError = hotelsQuery.error || roomsQuery.error;
  const error = queryError ? (queryError as Error).message : null;

  const filteredItems = useMemo(() => {
    return accommodations
      .filter(item => {
        // Staff-controlled close-out always hides a room.
        if (item.manualStopSell === true) return false;

        // Date-aware availability: when the guest has picked dates, hide a room
        // only if it's sold out FOR THOSE DATES. While the availability is still
        // loading we leave the room visible to avoid a false "no results" flash.
        // (We deliberately no longer hide on the dateless `isAvailable` flag, which
        // wrongly hid a room on all dates once it was booked for any range.)
        if (datesSelected && availabilityMap) {
          const remaining = availabilityMap[item.id];
          if (remaining !== undefined && remaining <= 0) return false;
        }

        const matchesType = filters.type === 'All' || item.type === filters.type;
        const matchesPrice = item.price >= filters.priceRange[0] && item.price <= filters.priceRange[1];
        const matchesRating = item.rating >= filters.minRating;
        const itemLocation = item.location || hotels.find(h => h.id === item.hotelId)?.location || '';
        const matchesLocation = filters.location === 'All' || itemLocation.toLowerCase() === filters.location.toLowerCase();
        const matchesHotel = !filters.hotelId || filters.hotelId === 'All' || item.hotelId === filters.hotelId;

        return matchesType && matchesPrice && matchesRating && matchesLocation && matchesHotel;
      })
      // Make the card's "Already Booked" overlay date-aware. The dateless
      // `isAvailable` flag stays false once a room is booked for ANY range, which
      // wrongly marked rooms booked even for dates AFTER an existing checkout.
      // With no dates we can't know date-specific availability, so the room is
      // always shown as bookable (BookingForm validates the dates the guest
      // actually picks). With dates chosen we drive the overlay from the same
      // date-aware map the filter uses (remaining > 0 ⇒ bookable for those dates).
      .map(item => {
        let isAvailable = true;
        if (datesSelected && availabilityMap) {
          const remaining = availabilityMap[item.id];
          if (remaining !== undefined) isAvailable = remaining > 0;
        }
        return { ...item, isAvailable };
      });
  }, [accommodations, hotels, filters, datesSelected, availabilityMap]);

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
