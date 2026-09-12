import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
/* ---------------- Countries ---------------- */
export function useCountries() {
  return useQuery({ queryKey: ['countries'], queryFn: async () => (await api.get('/countries')).data.countries });
}
 
/* ---------------- States (by country) ---------------- */
export function useStates(countryId) {
  return useQuery({
    queryKey: ['states', countryId || null],
    queryFn: async () => (await api.get('/states', { params: { countryId } })).data.states,
    enabled: !!countryId,
  });
}
 
/* ---------------- All states (for global filters) ---------------- */
export function useAllStates() {
  return useQuery({
    queryKey: ['states', 'all'],
    queryFn: async () => (await api.get('/states')).data.states,
  });
}
 
/* ---------------- Districts (by state) ---------------- */
export function useDistricts(stateId) {
  return useQuery({
    queryKey: ['districts', stateId || null],
    queryFn: async () => (await api.get('/districts', { params: { stateId } })).data.districts,
    enabled: !!stateId,
  });
}
 
/* ---------------- Master mapping tree ---------------- */
export function useGeoTree() {
  return useQuery({ queryKey: ['geo-tree'], queryFn: async () => (await api.get('/geo/tree')).data.countries });
}
 
/* ---------------- CRUD (Country / State / District) ---------------- */
// `level` is 'countries' | 'states' | 'districts'
function invalidateGeo(qc) {
  qc.invalidateQueries({ queryKey: ['geo-tree'] });
  qc.invalidateQueries({ queryKey: ['countries'] });
  qc.invalidateQueries({ queryKey: ['states'] });
  qc.invalidateQueries({ queryKey: ['districts'] });
}
 
export function useSaveGeo(level) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id ? (await api.put(`/${level}/${id}`, data)).data : (await api.post(`/${level}`, data)).data,
    onSuccess: () => invalidateGeo(qc),
  });
}
export function useDeleteGeo(level) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/${level}/${id}`)).data,
    onSuccess: () => invalidateGeo(qc),
  });
}
 
/* ---------------- Bulk upload ---------------- */
export function useGeoImportPreview() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post('/geo/import?preview=true', form)).data;
    },
  });
}
export function useGeoImportCommit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post('/geo/import', form)).data;
    },
    onSuccess: () => invalidateGeo(qc),
  });
}
 
/** Download the location bulk-upload template through the authenticated API. */
export async function downloadGeoTemplate() {
  const res = await api.get('/geo/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FH-Location-Import-Template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
