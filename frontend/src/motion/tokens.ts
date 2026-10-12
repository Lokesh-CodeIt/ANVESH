/**
 * ANVESH Motion Tokens
 * Built strictly according to the motion specification:
 * - Restrained power/expo easings (NO Back, Elastic, or Bounce)
 * - Controlled durations and distances
 * - Reduced motion fallbacks
 */

export const MOTION_TOKENS = {
  // Durations (in seconds for GSAP)
  durations: {
    micro: 0.15,          // 120-180ms
    standard: 0.28,       // 240-360ms
    moderate: 0.45,
    maxTransition: 0.6,   // Never exceed 600ms for portal transitions
    reveal: 0.95,         // 0.8-1.2s for public website reveals
    sceneTransition: 1.1, // 0.9-1.4s for public scenes
    ambientLoop: 10.0,    // 8-14s for slow background drift
  },

  // Staggers
  staggers: {
    micro: 0.03,
    standard: 0.05,       // Maximum 0.05s stagger
    relaxed: 0.08,
  },

  // Distances (px)
  distances: {
    micro: 6,
    standard: 12,         // 8-16px movement
    section: 24,
    ambientMaxMove: 8,    // Movement limited to <= 10px
  },

  // Rotation limits
  rotation: {
    ambientMaxDeg: 2.5,   // Limited to <= 3 degrees
  },

  // Verified Restrained Easings (Never Back, Elastic, or Bounce)
  easings: {
    power1Out: 'power1.out',
    power2Out: 'power2.out',
    power3Out: 'power3.out',
    power2InOut: 'power2.inOut',
    expoOut: 'expo.out',
    sineInOut: 'sine.inOut',
  },

  // Reduced motion overrides
  reducedMotion: {
    duration: 0.12,       // <= 150ms opacity transition
    ease: 'power1.out',
  },
} as const;
