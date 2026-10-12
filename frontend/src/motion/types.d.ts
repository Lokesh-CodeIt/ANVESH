// GSAP 3.15.0 TypeScript Declaration Shim for Vendored ESM Modules

export type GsapTweenTarget = string | object | null | undefined | Element | Element[] | NodeList;

export interface GsapContext {
  add(method: Function): void;
  revert(): void;
  kill(revert?: boolean): void;
  clear(): void;
}

export interface GsapMatchMedia {
  add(conditions: Record<string, string> | string, func: (context: any) => void): void;
  revert(): void;
}

declare global {
  namespace gsap {
    namespace core {
      type Tween = any;
      type Timeline = any;
    }
  }
}

declare module '@/vendor/gsap/index.js' {
  export const gsap: any;
  export const Power0: any;
  export const Power1: any;
  export const Power2: any;
  export const Power3: any;
  export const Power4: any;
  export const Linear: any;
  export const Quad: any;
  export const Cubic: any;
  export const Quart: any;
  export const Quint: any;
  export const Strong: any;
  export const Sine: any;
  export const Expo: any;
  export const Circ: any;
  export default gsap;
}

declare module '@/vendor/gsap/ScrollTrigger.js' {
  export const ScrollTrigger: any;
  export default ScrollTrigger;
}

declare module '@/vendor/gsap/ScrollSmoother.js' {
  export const ScrollSmoother: any;
  export default ScrollSmoother;
}

declare module '@/vendor/gsap/SplitText.js' {
  export const SplitText: any;
  export default SplitText;
}

declare module '@/vendor/gsap/Flip.js' {
  export const Flip: any;
  export default Flip;
}

declare module '@/vendor/gsap/DrawSVGPlugin.js' {
  export const DrawSVGPlugin: any;
  export default DrawSVGPlugin;
}

declare module '@/vendor/gsap/MorphSVGPlugin.js' {
  export const MorphSVGPlugin: any;
  export default MorphSVGPlugin;
}

declare module '@/vendor/gsap/MotionPathPlugin.js' {
  export const MotionPathPlugin: any;
  export default MotionPathPlugin;
}

declare module '@/vendor/gsap/CustomEase.js' {
  export const CustomEase: any;
  export default CustomEase;
}
