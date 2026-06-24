import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setAuth: (user, accessToken) => set({
    user,
    accessToken,
    isAuthenticated: true,
    isInitializing: false,
  }),

  clearAuth: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isInitializing: false,
  }),

  setInitializing: (isInitializing) => set({ isInitializing }),

  // Attempt to restore session on app load using httpOnly refresh cookie
  initAuth: async () => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const data = response?.data?.data;
      if (data?.user && data?.accessToken) {
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        throw new Error('Invalid token refresh payload format');
      }
    } catch (error) {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },
}));

export default useAuthStore;
export { useAuthStore };
