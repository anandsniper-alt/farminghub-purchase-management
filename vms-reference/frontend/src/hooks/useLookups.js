import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
/* ---------------- Category groups ---------------- */
export function useCategoryGroups() {
  return useQuery({
    queryKey: ['category-groups'],
    queryFn: async () => (await api.get('/category-groups')).data.groups,
  });
}
export function useSaveCategoryGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id ? (await api.put(`/category-groups/${id}`, data)).data.group
         : (await api.post('/category-groups', data)).data.group,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category-groups'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
export function useDeleteCategoryGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/category-groups/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category-groups'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
 
/* ---------------- Vendor stages ---------------- */
export function useStages() {
  return useQuery({ queryKey: ['stages'], queryFn: async () => (await api.get('/stages')).data.stages });
}
export function useSaveStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id ? (await api.put(`/stages/${id}`, data)).data.stage : (await api.post('/stages', data)).data.stage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
  });
}
export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/stages/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
  });
}
 
/* ---------------- Photo types ---------------- */
export function usePhotoTypes() {
  return useQuery({ queryKey: ['photo-types'], queryFn: async () => (await api.get('/photo-types')).data.photoTypes });
}
export function useSavePhotoType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id ? (await api.put(`/photo-types/${id}`, data)).data.photoType
         : (await api.post('/photo-types', data)).data.photoType,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photo-types'] }),
  });
}
export function useDeletePhotoType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/photo-types/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photo-types'] }),
  });
}
 
/* ---------------- Assignable users (for "Assigned to" dropdowns) ---------------- */
export function useAssignableUsers() {
  return useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => (await api.get('/users/assignable')).data.users,
  });
}
 
/* ---------------- Product lines ---------------- */
export function useProductLines() {
  return useQuery({ queryKey: ['product-lines'], queryFn: async () => (await api.get('/product-lines')).data.productLines });
}
export function useSaveProductLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) =>
      id ? (await api.put(`/product-lines/${id}`, data)).data.productLine
         : (await api.post('/product-lines', data)).data.productLine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-lines'] }),
  });
}
export function useDeleteProductLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/product-lines/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-lines'] }),
  });
}
 
/* ---------------- Currency rates ---------------- */
export function useCurrencyRates() {
  return useQuery({ queryKey: ['currency-rates'], queryFn: async () => (await api.get('/currency-rates')).data.rates });
}
export function useSaveCurrencyRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rates) => (await api.put('/currency-rates', { rates })).data.rates,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currency-rates'] }),
  });
}
export function useRefreshCurrencyRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/currency-rates/refresh')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currency-rates'] }),
  });
}
