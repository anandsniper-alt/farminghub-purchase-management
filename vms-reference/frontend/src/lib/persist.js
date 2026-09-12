import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
 
// IndexedDB-backed async storage for the React Query cache, so previously loaded
// vendor / master data is available offline and across reloads.
const idbStorage = {
  getItem: (key) => get(key),
  setItem: (key, value) => set(key, value),
  removeItem: (key) => del(key),
};
 
export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: 'fh-vms-query-cache',
  throttleTime: 1000,
});
