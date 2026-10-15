import React, { useEffect } from 'react';

interface PreloaderProps {
  onComplete: () => void;
}

const SESSION_PRELOADER_KEY = 'anvesh_preloader_seen';

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_PRELOADER_KEY, 'true');
    } catch (_) {}
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }, [onComplete]);

  return null;
};
