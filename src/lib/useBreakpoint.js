// Tracks the window width + primary-pointer capability.
// `isTablet` is true when EITHER:
//   - the viewport is narrower than the laptop threshold (1280px), OR
//   - the device's primary pointer is coarse (i.e. touch is the main input).
//
// Width-only would miss iPad landscape (1024px) and iPad Pro landscape
// (1194/1366px) — both should clearly be "tablet" for layout purposes.
// Coarse-pointer detection covers them regardless of orientation, plus
// Surface Pro / other touch-first devices.
//
// Desktop browsers can still simulate tablet by resizing the window
// narrower than 1280, which is useful for development.

import { useState, useEffect } from "react";

const LAPTOP_BREAKPOINT = 1280;

const detectCoarse = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
};

export function useBreakpoint() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const [coarse, setCoarse] = useState(detectCoarse);

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);

    // Pointer capability can change (external mouse plugged into iPad) — listen too.
    const mq = window.matchMedia?.('(pointer: coarse)');
    const onPointerChange = (e) => setCoarse(e.matches);
    mq?.addEventListener?.('change', onPointerChange);

    return () => {
      window.removeEventListener('resize', onResize);
      mq?.removeEventListener?.('change', onPointerChange);
    };
  }, []);

  return { isTablet: w < LAPTOP_BREAKPOINT || coarse, w, coarse };
}
