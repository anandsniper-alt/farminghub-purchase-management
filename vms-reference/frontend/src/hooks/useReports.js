import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useVendors } from './useVendors.js';
import { useCategories } from './useTaxonomies.js';
import { computeCategoryConcentration } from '../lib/concentration.js';
 
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  });
}
 
export function useConcentration() {
  return useQuery({
    queryKey: ['concentration'],
    queryFn: async () => (await api.get('/reports/concentration')).data,
  });
}
 
/**
 * Sourcing concentration by PRODUCT CATEGORY — computed client-side from the
 * categories master + the full vendors dataset (no backend changes).
 */
export function useCategoryConcentration() {
  const { data: categories = [], isLoading: lc } = useCategories();
  const { data: vendorsData, isLoading: lv } = useVendors({ page: 1, pageSize: 1000 });
  const vendors = vendorsData?.data || [];
  const data = useMemo(() => computeCategoryConcentration(categories, vendors), [categories, vendors]);
  return { data, isLoading: lc || lv };
}
