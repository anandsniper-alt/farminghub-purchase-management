import { api } from '../lib/api.js';
import { queryClient } from '../lib/queryClient.js';
import { getOutbox, updateOutbox, removeOutbox, countOutbox } from './db.js';
 
// ---- tiny reactive store for UI (online status + pending count + syncing) ----
const state = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pending: 0,
  syncing: false,
  lastSyncAt: null,
  lastResult: null, // { synced, failed } from the most recent run — drives the "Synced/Failed" indicator
};
const listeners = new Set();
function emit() {
  for (const l of listeners) l({ ...state });
}
export function subscribeSync(fn) {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}
export function getSyncState() {
  return { ...state };
}
 
async function refreshCount() {
  state.pending = await countOutbox();
  emit();
}
 
// ---- sync engine ----
let running = false;
 
export async function syncOutbox({ silent = false } = {}) {
  if (running || !state.online) return { synced: 0, failed: 0 };
  running = true;
  state.syncing = true;
  emit();
 
  let synced = 0;
  let failed = 0;
  try {
    const items = await getOutbox();
    for (const item of items) {
      try {
        await updateOutbox(item.id, { status: 'syncing', error: null });
 
        if (item.kind === 'vendor-edit') {
          // Edit of an existing vendor — last write wins (server overwrites with our payload).
          await api.put(`/vendors/${item.vendorId}`, item.payload);
        } else if (item.kind === 'interaction') {
          // Create an interaction (multipart: fields + any attachments/voice notes).
          const form = new FormData();
          for (const [k, v] of Object.entries(item.fields || {})) {
            if (v !== undefined && v !== null && v !== '') form.append(k, v);
          }
          for (const f of item.files || []) {
            form.append('files', new File([f.blob], f.name || 'file', { type: f.type || 'application/octet-stream' }));
          }
          await api.post(`/vendors/${item.vendorId}/interactions`, form);
        } else {
          // Default: create a new vendor, then upload any offline photos.
          const res = await api.post('/vendors', item.payload);
          const vendorId = res.data.vendor.id;
          for (const p of item.photos || []) {
            const form = new FormData();
            const file = new File([p.blob], p.name || 'photo.jpg', { type: p.type || 'image/jpeg' });
            form.append('photos', file);
            if (p.caption) form.append('caption', p.caption);
            if (p.typeLabel) form.append('typeLabel', p.typeLabel);
            if (p.typeId) form.append('typeId', p.typeId);
            await api.post(`/vendors/${vendorId}/photos`, form);
          }
        }
 
        await removeOutbox(item.id);
        synced += 1;
      } catch (err) {
        failed += 1;
        const status = err?.response?.status;
        // If the server rejected it (validation/auth), keep it flagged; if it's a
        // network error, we'll simply retry next time online.
        await updateOutbox(item.id, {
          status: 'error',
          attempts: (item.attempts || 0) + 1,
          error: err?.response?.data?.error || err.message || 'Sync failed',
          serverRejected: status && status >= 400 && status < 500,
        });
        // Stop the loop on a network drop to avoid hammering
        if (!status) break;
      }
    }
    state.lastSyncAt = Date.now();
    state.lastResult = { synced, failed };
    // Pull fresh server records into the caches now that our changes are up.
    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    }
  } finally {
    running = false;
    state.syncing = false;
    await refreshCount();
  }
  return { synced, failed };
}
 
/** Call after queueing something so the badge updates and a sync is attempted. */
export async function notifyQueued() {
  await refreshCount();
  if (state.online) syncOutbox({ silent: true });
}
 
// ---- boot: wire online/offline + initial sync ----
export function initSync() {
  if (typeof window === 'undefined') return;
  const setOnline = (v) => {
    state.online = v;
    emit();
    if (v) syncOutbox({ silent: true });
  };
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
  // periodic retry while there are pending items
  setInterval(() => {
    if (state.online && state.pending > 0 && !state.syncing) syncOutbox({ silent: true });
  }, 30000);
  refreshCount().then(() => {
    if (state.online) syncOutbox({ silent: true });
  });
}
