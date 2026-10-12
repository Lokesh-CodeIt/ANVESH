import React, { createContext, useContext } from 'react';
import { usePrefersReducedMotion } from '../motion/hooks/usePrefersReducedMotion.ts';
import { usePauseAnimations } from '../motion/hooks/usePauseAnimations.ts';

interface MotionPreferencesContextType {
  isReducedMotion: boolean;
  isAnimationsPaused: boolean;
  setAnimationsPaused: (paused: boolean) => void;
}

const MotionPreferencesContext = createContext<MotionPreferencesContextType>({
  isReducedMotion: false,
  isAnimationsPaused: false,
  setAnimationsPaused: () => {},
});

export const MotionPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isReducedMotion = usePrefersReducedMotion();
  const [isAnimationsPaused, setAnimationsPaused] = usePauseAnimations();

  return (
    <MotionPreferencesContext.Provider
      value={{
        isReducedMotion,
        isAnimationsPaused,
        setAnimationsPaused,
      }}
    >
      {children}
    </MotionPreferencesContext.Provider>
  );
};

export const useMotionPreferences = () => useContext(MotionPreferencesContext);
