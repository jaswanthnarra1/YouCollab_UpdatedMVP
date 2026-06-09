import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // critical for receiving and sending httpOnly refresh cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Bearer Access Token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Seamless Access Token Renewal via Refresh Token
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Standard User-friendly error extraction
    const responseError = error.response?.data?.error || {
      message: 'Network error. Make sure your server is running!',
      code: 'NETWORK_ERROR',
    };

    // If 401 Unauthorized, attempt token rotation refresh (skip for login/register)
    const isAuthRoute = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Run refresh POST request (browser will send httpOnly refresh cookie automatically)
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { user, accessToken } = refreshResponse.data.data;

        // Save new accessToken in Zustand store
        useAuthStore.getState().setAuth(user, accessToken);

        isRefreshing = false;
        processQueue(null, accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Session totally dead, force sign-out
        useAuthStore.getState().clearAuth();
        
        // Return clear, operational UNAUTHORIZED reject
        return Promise.reject({
          ...error,
          responseError: {
            message: 'Your session has expired. Please sign in again.',
            code: 'SESSION_EXPIRED',
          },
        });
      }
    }

    // Attach processed message to original error object
    error.responseError = responseError;
    return Promise.reject(error);
  }
);

export default apiClient;
export { apiClient };
