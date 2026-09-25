import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'spendsense_theme';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {
    // Ignore localStorage access errors
  }
  return 'dark';
}

type Listener = (theme: Theme) => void;
const listeners = new Set<Listener>();
let currentTheme: Theme = getInitialTheme();

function applyTheme(nextTheme: Theme) {
  currentTheme = nextTheme;
  const root = document.documentElement;
  if (nextTheme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  }

  try {
    localStorage.setItem(STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage write errors
  }

  listeners.forEach((listener) => listener(nextTheme));
  window.dispatchEvent(new CustomEvent('spendsense-theme-change', { detail: nextTheme }));
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
}

export function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  useEffect(() => {
    listeners.add(setThemeState);
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setTheme,
  };
}

/** Initialize theme immediately on script load to prevent white/dark flash */
export function initThemeOnLoad() {
  applyTheme(getInitialTheme());
}

