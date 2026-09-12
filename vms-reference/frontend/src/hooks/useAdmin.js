import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
/* ----------------------------- Users ----------------------------- */
export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data.users });
}
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await api.post('/users', data)).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await api.put(`/users/${id}`, data)).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
export function useUserPermissions(id) {
  return useQuery({
    queryKey: ['user-permissions', id],
    queryFn: async () => (await api.get(`/users/${id}/permissions`)).data,
    enabled: !!id,
  });
}
export function useSetUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, permissions }) => (await api.put(`/users/${id}/permissions`, { permissions })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['user-permissions', v.id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
 
/* ----------------------------- Roles ----------------------------- */
export function useRoleMatrix() {
  return useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/roles')).data });
}
export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, permissions }) => (await api.put(`/roles/${role}`, { permissions })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}
export function useSetAllRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, value }) => (await api.post(`/roles/${role}/set-all`, { value })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}
export function useCopyRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, to }) => (await api.post('/roles/copy', { from, to })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}
 
/* ------------------------ Password resets ------------------------ */
export function useResetRequests(status = 'PENDING') {
  return useQuery({
    queryKey: ['reset-requests', status],
    queryFn: async () => (await api.get(`/auth/password-reset/requests?status=${status}`)).data.requests,
  });
}
export function useResolveReset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => (await api.post(`/auth/password-reset/${id}/${action}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reset-requests'] }),
  });
}
 
/** Public — request a password reset (from the login page). */
export async function requestPasswordReset(payload) {
  return (await api.post('/auth/password-reset/request', payload)).data;
}
