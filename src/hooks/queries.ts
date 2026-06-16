import { useQuery } from '@tanstack/react-query';
import { dbService } from '../services/db';
import { queryKeys } from '../lib/queryClient';
import { Hotel, Accommodation } from '../types';

// Shared catalogue queries. Using identical query keys + fns everywhere means
// the home page, accommodation tab, ContactUs, etc. all read from one cache
// entry instead of each firing its own request.
//
// We pass refresh=true so the server returns live data (it has its own short
// in-memory cache); TanStack Query is now the client-side cache of record.

export const useHotelsQuery = () =>
  useQuery<Hotel[]>({ queryKey: queryKeys.hotels, queryFn: () => dbService.getHotels(true) });

export const useRoomsQuery = () =>
  useQuery<Accommodation[]>({ queryKey: queryKeys.rooms, queryFn: () => dbService.getRooms(undefined, true) });

export const useMediaQuery = (parentId: string | undefined, enabled = true) =>
  useQuery<any[]>({
    queryKey: queryKeys.media(parentId || ''),
    queryFn: () => dbService.getMedia(parentId as string),
    enabled: enabled && !!parentId,
  });

// Per-room remaining units for the selected dates. Only runs once BOTH dates are
// set; the storefront uses it to hide rooms sold out for those specific dates.
export const useAvailabilityQuery = (checkIn?: string, checkOut?: string) =>
  useQuery<Record<string, number>>({
    queryKey: queryKeys.availability(checkIn || '', checkOut || ''),
    queryFn: () => dbService.getBatchAvailability(checkIn as string, checkOut as string),
    enabled: !!checkIn && !!checkOut,
  });
