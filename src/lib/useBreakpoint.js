// Tracks the window width and exposes a coarse breakpoint flag.
// `isTablet` flips at <1024px so iPad portrait (768) gets tablet treatment
// and iPad landscape (1024) gets laptop treatment. Field-tech use is
// dominantly iPad portrait, so most layout branches key off this.

import { useState, useEffect } from "react";

export function useBreakpoint() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isTablet: w < 1024, w };
}
