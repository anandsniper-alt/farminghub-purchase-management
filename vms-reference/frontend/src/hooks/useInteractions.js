import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
export function useInteractions(vendorId) {
  return useQuery({
    queryKey: ['interactions', vendorId],
    queryFn: async () => (await api.get(`/vendors/${vendorId}/interactions`)).data.interactions,
    enabled: !!vendorId,
  });
}
 
export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendorId, type, title, notes, occurredAt, nextFollowUpAt, files }) => {
      const form = new FormData();
      if (type) form.append('type', type);
      if (title) form.append('title', title);
      if (notes) form.append('notes', notes);
      if (occurredAt) form.append('occurredAt', occurredAt);
      if (nextFollowUpAt) form.append('nextFollowUpAt', nextFollowUpAt);
      (files || []).forEach((f) => form.append('files', f));
      return (await api.post(`/vendors/${vendorId}/interactions`, form)).data.interaction;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['interactions', vars.vendorId] });
      qc.invalidateQueries({ queryKey: ['vendors', 'detail', vars.vendorId] });
      qc.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });
}
 
export function useDeleteInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ interactionId }) => (await api.delete(`/interactions/${interactionId}`)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['interactions', vars.vendorId] });
      qc.invalidateQueries({ queryKey: ['vendors', 'detail', vars.vendorId] });
    },
  });
}
 
export function useAnalytics() {
  return useQuery({ queryKey: ['analytics'], queryFn: async () => (await api.get('/reports/analytics')).data });
}
