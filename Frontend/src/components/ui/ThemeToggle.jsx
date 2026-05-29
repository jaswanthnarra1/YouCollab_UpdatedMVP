import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useUiStore from '../../stores/uiStore';

export const ThemeToggle = () => {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-all active:scale-95 dark:bg-dark-surface dark:hover:bg-dark-bg dark:text-dark-muted dark:hover:text-dark-text"
      aria-label="Toggle dark mode preference"
    >
      {theme === 'dark' ? (
        <Sun size={18} className="animate-fade-in text-amber-400" />
      ) : (
        <Moon size={18} className="animate-fade-in text-indigo-500" />
      )}
    </button>
  );
};

export default ThemeToggle;
