import { queryClient, queryKeys } from './queryClient';

// Invalidate the shared catalogue cache so every component reading hotels/rooms
// refetches. Call sites (admin mutations, cart checkout) stay unchanged.
export const triggerDataRefresh = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.hotels });
  queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
};
