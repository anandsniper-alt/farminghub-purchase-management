import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { REGISTRY, genericMeta } from '../lib/columnRegistry.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
const SKELETON_INTERNAL = new Set(['id', '_pending', 'vendorId', 'interactionId']);
 
/** Build the full meta map: registry columns + auto-detected scalar fields from a sample row. */
function buildMeta(listKey, sampleRow) {
  const registry = REGISTRY[listKey] || {};
  const meta = { ...registry };
  if (sampleRow) {
    let i = 0;
    for (const [k, val] of Object.entries(sampleRow)) {
      if (k in meta || SKELETON_INTERNAL.has(k) || k.endsWith('Id')) continue;
      const t = typeof val;
      if (val === null || t === 'string' || t === 'number' || t === 'boolean') {
        meta[k] = genericMeta(k, i++);
      }
    }
  }
  return meta;
}
 
/** Merge saved layout (personal||global) with meta → ordered column list. */
function mergeColumns(meta, saved) {
  const keys = Object.keys(meta);
  let ordered;
  if (saved && saved.length) {
    const savedKeys = saved.filter((c) => meta[c.key]);
    const seen = new Set(savedKeys.map((c) => c.key));
    // New/available columns not in the saved layout are appended hidden.
    const extras = keys
      .filter((k) => !seen.has(k))
      .sort((a, b) => (meta[a].defaultOrder || 0) - (meta[b].defaultOrder || 0))
      .map((k) => ({ key: k, visible: false }));
    ordered = [...savedKeys, ...extras];
  } else {
    ordered = keys
      .sort((a, b) => (meta[a].defaultOrder || 0) - (meta[b].defaultOrder || 0))
      .map((k) => ({ key: k, visible: meta[k].defaultVisible }));
  }
  return ordered.map((c) => {
    const m = meta[c.key];
    return {
      key: c.key,
      label: c.label || m.label,
      visible: c.visible !== undefined ? c.visible : m.defaultVisible,
      width: c.width ?? m.width,
      frozen: c.frozen ?? false,
      sortKey: m.sortKey,
      render: m.render,
      exportValue: m.exportValue,
      exportable: m.exportable !== false,
      dynamic: !!m.dynamic,
    };
  });
}
 
/** Strip a full column list down to the persisted shape. */
export function toSavedConfig(columns) {
  return columns.map((c) => ({ key: c.key, label: c.label, visible: c.visible, width: c.width, frozen: c.frozen }));
}
 
export function useColumnConfig(listKey, sampleRow) {
  const qc = useQueryClient();
  const { has } = useAuth();
  const isAdmin = has('settings', 'edit');
 
  const { data, isLoading } = useQuery({
    queryKey: ['column-configs', listKey],
    queryFn: async () => (await api.get(`/column-configs/${listKey}`)).data,
  });
 
  const meta = useMemo(() => buildMeta(listKey, sampleRow), [listKey, sampleRow]);
  const saved = data?.personal || data?.global || null;
  const columns = useMemo(() => mergeColumns(meta, saved), [meta, saved]);
 
  const invalidate = () => qc.invalidateQueries({ queryKey: ['column-configs', listKey] });
 
  const savePersonal = useMutation({
    mutationFn: async (config) => (await api.put(`/column-configs/${listKey}`, { config })).data,
    onSuccess: invalidate,
  });
  const saveGlobal = useMutation({
    mutationFn: async (config) => (await api.put(`/column-configs/${listKey}/global`, { config })).data,
    onSuccess: invalidate,
  });
  const reset = useMutation({
    mutationFn: async () => (await api.delete(`/column-configs/${listKey}`)).data,
    onSuccess: invalidate,
  });
 
  return {
    isLoading,
    columns, // full ordered list (visible + hidden), each with render/exportValue
    visibleColumns: columns.filter((c) => c.visible),
    isAdmin,
    hasPersonal: !!data?.personal,
    hasGlobal: !!data?.global,
    savePersonal, saveGlobal, reset,
  };
}
