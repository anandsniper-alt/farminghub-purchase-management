import axios from 'axios';
 
const baseURL = import.meta.env.VITE_API_URL || '/api';
 
export const api = axios.create({ baseURL });
 
const TOKEN_KEY = 'fh_vms_token';
 
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
 
// Attach bearer token to every request
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
 
// Global 401 handling — clear token and bounce to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);
 
/** Extract a human-readable message from an axios error. */
export function apiError(error, fallback = 'Something went wrong') {
  const data = error?.response?.data;
  if (data?.details?.length) {
    return data.details.map((d) => `${d.field}: ${d.message}`).join(', ');
  }
  return data?.error || error?.message || fallback;
}
