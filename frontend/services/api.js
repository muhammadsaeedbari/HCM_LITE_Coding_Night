import axios from 'axios';
import { handleLocalRequest } from './localBackend.js';

const defaultBaseUrl = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:8080/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hcm_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const isBackendUnreachable =
      !error.response ||
      status === 404 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      (status === 500 &&
        !error.response?.data?.message);

    // If the serverless backend is not mounted (404 on Vercel static deployment)
    // or unreachable, automatically use the built-in localStorage engine!
    if (isBackendUnreachable && error.config && !error.config._usedLocalFallback) {
      error.config._usedLocalFallback = true;
      try {
        return await handleLocalRequest(error.config);
      } catch (localErr) {
        const msg =
          localErr.response?.data?.message ||
          localErr.message ||
          'Request failed.';
        localErr.message = msg;
        return Promise.reject(localErr);
      }
    }

    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : 'Unable to connect to the server.');

    error.message = message;

    return Promise.reject(error);
  }
);

export default API;
