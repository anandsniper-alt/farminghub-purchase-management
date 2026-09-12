import { openDB } from 'idb';
 
const DB_NAME = 'fh-vms-offline';
const DB_VERSION = 1;
const OUTBOX = 'outbox';
 
let _db;
function db() {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(OUTBOX)) {
          const store = database.createObjectStore(OUTBOX, { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return _db;
}
 
function uid() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
 
async function enqueue(record) {
  const full = { id: uid(), status: 'pending', error: null, attempts: 0, createdAt: Date.now(), ...record };
  await (await db()).put(OUTBOX, full);
  return full;
}
 
/**
 * Queue a vendor to be created once online.
 * @param {object} payload  vendor JSON for POST /api/vendors
 * @param {Array<{blob:Blob,name:string,type:string,typeLabel?:string,caption?:string}>} photos
 * @param {object} preview  lightweight display fields (name, city, components…)
 */
export async function enqueueVendor(payload, photos = [], preview = {}) {
  return enqueue({ kind: 'vendor', payload, photos, preview });
}
 
/** Queue an edit of an existing (already-synced) vendor. */
export async function enqueueVendorEdit(vendorId, payload, preview = {}) {
  return enqueue({ kind: 'vendor-edit', vendorId, payload, preview });
}
 
/**
 * Queue an interaction to be created once online.
 * @param {string} vendorId
 * @param {object} fields  { type, title, notes, occurredAt, nextFollowUpAt }
 * @param {Array<{blob:Blob,name:string,type:string}>} files
 */
export async function enqueueInteraction(vendorId, fields, files = [], preview = {}) {
  return enqueue({ kind: 'interaction', vendorId, fields, files, preview });
}
 
export async function getOutbox() {
  const all = await (await db()).getAll(OUTBOX);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}
 
export async function countOutbox() {
  return (await db()).count(OUTBOX);
}
 
export async function updateOutbox(id, patch) {
  const d = await db();
  const rec = await d.get(OUTBOX, id);
  if (!rec) return;
  await d.put(OUTBOX, { ...rec, ...patch });
}
 
export async function removeOutbox(id) {
  await (await db()).delete(OUTBOX, id);
}
