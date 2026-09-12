import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
 
export function useImportPreview() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post('/vendors/import?preview=true', form)).data;
    },
  });
}
 
export function useImportCommit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post('/vendors/import', form)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['components'] });
    },
  });
}
 
/** Download the .xlsx template through the authenticated API. */
export async function downloadTemplate() {
  const res = await api.get('/vendors/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FH-Vendor-Import-Template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
