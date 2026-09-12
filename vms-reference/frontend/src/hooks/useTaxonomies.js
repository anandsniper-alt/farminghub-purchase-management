import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
/* ---------------- Expos ---------------- */
export function useExpos() {
  return useQuery({ queryKey: ['expos'], queryFn: async () => (await api.get('/expos')).data.expos });
}
export function useSaveExpo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id ? (await api.put(`/expos/${id}`, data)).data.expo : (await api.post('/expos', data)).data.expo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expos'] }),
  });
}
export function useDeleteExpo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/expos/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expos'] }),
  });
}
 
/* ---------------- Categories ---------------- */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data.categories,
  });
}
export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id
        ? (await api.put(`/categories/${id}`, data)).data.category
        : (await api.post('/categories', data)).data.category,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/categories/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
 
/* ---------------- Component tags ---------------- */
export function useComponents() {
  return useQuery({
    queryKey: ['components'],
    queryFn: async () => (await api.get('/components')).data.components,
  });
}
export function useSaveComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id
        ? (await api.put(`/components/${id}`, data)).data.component
        : (await api.post('/components', data)).data.component,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] }),
  });
}
export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/components/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] }),
  });
}
