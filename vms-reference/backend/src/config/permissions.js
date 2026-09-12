// Central definition of modules, actions, and per-role default permissions.
 
export const MODULES = [
  { key: 'vendors', label: 'Vendors' },
  { key: 'interactions', label: 'Interaction Log' },
  { key: 'expos', label: 'Expos & Fairs' },
  { key: 'products', label: 'Product Lines' },
  { key: 'components', label: 'Component Tags' },
  { key: 'reports', label: 'Analytics & Reports' },
  { key: 'settings', label: 'Settings' },
  { key: 'users', label: 'Users & Roles' },
];
 
export const ACTIONS = ['view', 'create', 'edit', 'delete'];
 
export const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
 
const act = (v) => ({ view: v, create: v, edit: v, delete: v });
const pick = ({ view = false, create = false, edit = false, del = false } = {}) => ({
  view, create, edit, delete: del,
});
 
/** Build a full permission object from a per-module function. */
function build(fn) {
  const out = {};
  for (const m of MODULES) out[m.key] = fn(m.key);
  return out;
}
 
export const EMPTY_PERMISSIONS = build(() => act(false));
export const FULL_PERMISSIONS = build(() => act(true));
 
export const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: FULL_PERMISSIONS,
 
  MANAGER: build((k) => {
    switch (k) {
      case 'vendors':
      case 'interactions':
      case 'expos':
      case 'products':
      case 'components':
        return act(true);
      case 'reports':
        return pick({ view: true });
      case 'settings':
        return pick({ view: true, create: true, edit: true });
      case 'users':
        return pick({ view: true });
      default:
        return act(false);
    }
  }),
 
  EMPLOYEE: build((k) => {
    switch (k) {
      case 'vendors':
        return pick({ view: true, create: true, edit: true });
      case 'interactions':
        return pick({ view: true, create: true });
      case 'expos':
      case 'products':
      case 'components':
      case 'reports':
        return pick({ view: true });
      default:
        return act(false);
    }
  }),
};
 
// Legacy roles kept in the enum so the DB migrates safely — map to a sensible default.
export const LEGACY_ROLE_FALLBACK = {
  PURCHASE: 'MANAGER',
  VIEWER: 'EMPLOYEE',
};
 
/** Normalise/deep-merge a partial permission object onto a base. */
export function mergePermissions(base, override) {
  if (!override) return base;
  const out = {};
  for (const m of MODULES) {
    out[m.key] = { ...(base[m.key] || act(false)), ...(override[m.key] || {}) };
  }
  return out;
}
 
/** Ensure a permissions object only contains known modules/actions (sanitise input). */
export function sanitizePermissions(input = {}) {
  const out = {};
  for (const m of MODULES) {
    const src = input[m.key] || {};
    out[m.key] = {};
    for (const a of ACTIONS) out[m.key][a] = !!src[a];
  }
  return out;
}
