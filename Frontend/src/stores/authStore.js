import { create } from 'zustand';
import axios from 'axios';

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
        'http://localhost:5000/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      const { user, accessToken } = response.data.data;
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isInitializing: false,
      });
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
