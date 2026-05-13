import { EVENTS } from '../constants';

export const triggerDataRefresh = () => {
  window.dispatchEvent(new CustomEvent(EVENTS.DATA_REFRESH));
};
