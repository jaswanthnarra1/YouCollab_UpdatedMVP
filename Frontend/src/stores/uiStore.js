import { create } from 'zustand';

// Sync theme with system settings or local preferences
const getInitialTheme = () => {
  // Always force dark theme
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }
  return 'dark';
};

const useUiStore = create((set, get) => ({
  theme: 'dark',
  sidebarOpen: true,
  toasts: [],

  toggleTheme: () => {
    // Force dark mode
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
    set({ theme: 'dark' });
  },

  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
    set({ theme: 'dark' });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  addToast: (message, type = 'success') => {
    const id = Date.now().toString();
    const newToast = { id, message, type };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto remove toasts after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));

export default useUiStore;
export { useUiStore };
