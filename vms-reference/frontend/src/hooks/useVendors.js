import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
const KEY = 'vendors';
 
export function useVendors(params) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: async () => (await api.get('/vendors', { params })).data,
    placeholderData: keepPreviousData,
  });
}
 
export function useVendor(id) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: async () => (await api.get(`/vendors/${id}`)).data.vendor,
    enabled: !!id,
  });
}
 
export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/vendors', payload)).data.vendor,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
 
export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/vendors/${id}`, payload)).data.vendor,
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      if (v?.id) qc.invalidateQueries({ queryKey: [KEY, 'detail', v.id] });
    },
  });
}
 
export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/vendors/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
 
export function useUploadPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendorId, files, caption, typeId, typeLabel }) => {
      const form = new FormData();
      files.forEach((f) => form.append('photos', f));
      if (caption) form.append('caption', caption);
      if (typeId) form.append('typeId', typeId);
      if (typeLabel) form.append('typeLabel', typeLabel);
      return (await api.post(`/vendors/${vendorId}/photos`, form)).data.photos;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: [KEY, 'detail', vars.vendorId] }),
  });
}
 
export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId }) => (await api.delete(`/photos/${photoId}`)).data,
    onSuccess: (_d, vars) =>
      vars.vendorId && qc.invalidateQueries({ queryKey: [KEY, 'detail', vars.vendorId] }),
  });
}
