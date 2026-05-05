// Tiny hook: call onClose when the user presses Escape.
// Modals throughout the app accept a backdrop-click close, but keyboard users
// (and anyone on a laptop reflexively reaching for Esc) had no way out.
// Auto-disables when `enabled` is false, so it's safe to drop into a component
// that conditionally renders.

import { useEffect } from 'react';

export function useEscapeClose(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof onClose !== 'function') return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, enabled]);
}
