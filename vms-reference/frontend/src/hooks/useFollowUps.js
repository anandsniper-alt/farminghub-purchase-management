import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
/** Follow-up dashboard rows (filters: status, assignedToId, city, productLineId, from, to, q). */
export function useFollowUps(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  return useQuery({
    queryKey: ['follow-ups', params],
    queryFn: async () => (await api.get('/follow-ups', { params })).data,
  });
}
 
export function useFollowUpSummary() {
  return useQuery({
    queryKey: ['follow-ups', 'summary'],
    queryFn: async () => (await api.get('/follow-ups/summary')).data,
  });
}
 
/** Complete or reschedule a follow-up (PATCH the interaction). */
export function useUpdateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ interactionId, nextFollowUpAt, followUpCompleted }) => {
      const body = {};
      if (nextFollowUpAt !== undefined) body.nextFollowUpAt = nextFollowUpAt;
      if (followUpCompleted !== undefined) body.followUpCompleted = followUpCompleted;
      return (await api.patch(`/interactions/${interactionId}`, body)).data.interaction;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['follow-ups'] });
      if (vars.vendorId) qc.invalidateQueries({ queryKey: ['interactions', vars.vendorId] });
    },
  });
}
