import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

/** Shared axios instance. Auth interceptors are added in Phase 1. */
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
