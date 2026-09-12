import { useEffect, useState } from 'react';
import { subscribeSync } from '../offline/sync.js';
 
export function useSyncState() {
  const [s, setS] = useState({ online: navigator.onLine, pending: 0, syncing: false, lastSyncAt: null });
  useEffect(() => subscribeSync(setS), []);
  return s;
}
