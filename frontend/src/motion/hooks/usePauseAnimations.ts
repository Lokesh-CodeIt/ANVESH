import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'anvesh_pause_animations';
const EVENT_KEY = 'anvesh_pause_animations_change';

/**
 * Hook to read and toggle the site-wide "Pause Animations" accessibility preference.
 * Persists across the current browser session.
 */
export function usePauseAnimations(): [boolean, (pause: boolean) => void] {
  const [isPaused, setIsPaused] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      setIsPaused(sessionStorage.getItem(STORAGE_KEY) === 'true');
    };

    window.addEventListener(EVENT_KEY, handleStorageChange);
    return () => window.removeEventListener(EVENT_KEY, handleStorageChange);
  }, []);

  const setPaused = useCallback((pause: boolean) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, pause ? 'true' : 'false');
    setIsPaused(pause);
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { pause } }));
  }, []);

  return [isPaused, setPaused];
}
