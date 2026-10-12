/**
 * ANVESH Centralized GSAP Registration
 * Registers local GSAP 3.15.0 ESM plugins once in a single shared module.
 * Never mixes incompatible ESM and UMD builds.
 * Implements graceful fallback if an optional plugin fails.
 */

import { gsap } from '@/vendor/gsap/index.js';
import { ScrollTrigger } from '@/vendor/gsap/ScrollTrigger.js';
import { ScrollSmoother } from '@/vendor/gsap/ScrollSmoother.js';
import { SplitText } from '@/vendor/gsap/SplitText.js';
import { Flip } from '@/vendor/gsap/Flip.js';
import { DrawSVGPlugin } from '@/vendor/gsap/DrawSVGPlugin.js';
import { MorphSVGPlugin } from '@/vendor/gsap/MorphSVGPlugin.js';
import { MotionPathPlugin } from '@/vendor/gsap/MotionPathPlugin.js';
import { CustomEase } from '@/vendor/gsap/CustomEase.js';

let _registered = false;
export const registeredPlugins: string[] = [];

export function initGsap(): typeof gsap {
  if (_registered || typeof window === 'undefined') {
    return gsap;
  }

  try {
    const pluginsToRegister: any[] = [];

    // Core essential plugins
    if (ScrollTrigger) {
      pluginsToRegister.push(ScrollTrigger);
      registeredPlugins.push('ScrollTrigger');
    }

    if (ScrollSmoother) {
      pluginsToRegister.push(ScrollSmoother);
      registeredPlugins.push('ScrollSmoother');
    }

    if (SplitText) {
      pluginsToRegister.push(SplitText);
      registeredPlugins.push('SplitText');
    }

    if (Flip) {
      pluginsToRegister.push(Flip);
      registeredPlugins.push('Flip');
    }

    if (DrawSVGPlugin) {
      pluginsToRegister.push(DrawSVGPlugin);
      registeredPlugins.push('DrawSVGPlugin');
    }

    if (MorphSVGPlugin) {
      pluginsToRegister.push(MorphSVGPlugin);
      registeredPlugins.push('MorphSVGPlugin');
    }

    if (MotionPathPlugin) {
      pluginsToRegister.push(MotionPathPlugin);
      registeredPlugins.push('MotionPathPlugin');
    }

    if (CustomEase) {
      pluginsToRegister.push(CustomEase);
      registeredPlugins.push('CustomEase');
    }

    gsap.registerPlugin(...pluginsToRegister);
    _registered = true;

    // Set default config
    gsap.config({
      autoSleep: 60,
      force3D: true,
      nullTargetWarn: false,
    });
  } catch (err) {
    console.warn('[ANVESH Motion] Optional GSAP plugin registration fallback:', err);
    _registered = true;
  }

  return gsap;
}

// Immediately initialize in browser
if (typeof window !== 'undefined') {
  initGsap();
}

export {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  Flip,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  CustomEase,
};
