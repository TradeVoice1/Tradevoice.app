// iOS "Add to Home Screen" hint.
//
// iOS Safari has no automatic install prompt (unlike Android/Chrome), so the
// only way a contractor installs Tradevoice on an iPhone/iPad is Share → Add
// to Home Screen — and most people don't know to do that. This shows a small,
// one-time, dismissible banner telling them how.
//
// It appears ONLY when all of these are true:
//   - on iOS (iPhone or iPad — including iPadOS's desktop-class Safari UA)
//   - in Safari (Add to Home Screen doesn't work in Chrome/Firefox/Edge on iOS)
//   - not already installed (not running standalone from the home screen)
//   - not previously dismissed
//
// It's plain DOM (no React) so it lives entirely outside the app tree and can
// never interfere with rendering. Every step is guarded — a hint must never
// break the app.

const DISMISS_KEY = 'tv_ios_install_hint_dismissed';

export function initIosInstallHint() {
  try {
    const ua = navigator.userAgent || '';
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS reports as Mac
    if (!isIOS) return;
    // Add to Home Screen only works in Safari on iOS.
    if (/CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua)) return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Small delay so it doesn't slam in over first paint.
    setTimeout(showBanner, 1800);
  } catch {
    /* never break the app over an install hint */
  }
}

function showBanner() {
  if (document.getElementById('tv-ios-hint')) return;

  const style = document.createElement('style');
  style.textContent = `
    #tv-ios-hint {
      position: fixed; left: 12px; right: 12px;
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      z-index: 2147483000;
      background: #ffffff; color: #111827;
      border: 1px solid #e5e7eb; border-radius: 14px;
      box-shadow: 0 10px 30px rgba(17,24,39,0.18), 0 2px 6px rgba(17,24,39,0.10);
      padding: 12px 12px 12px 14px;
      display: flex; align-items: center; gap: 12px;
      font-family: 'DM Sans', -apple-system, system-ui, sans-serif; font-size: 14px;
      animation: tvHintUp 0.28s ease;
      max-width: 520px; margin: 0 auto;
    }
    @keyframes tvHintUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    #tv-ios-hint .tv-ios-hint-mark {
      flex-shrink: 0; width: 38px; height: 38px; border-radius: 9px;
      background: #2d6a4f; color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-family: Georgia, serif; font-size: 16px;
    }
    #tv-ios-hint .tv-ios-hint-body { flex: 1; line-height: 1.4; }
    #tv-ios-hint .tv-ios-hint-body b { font-weight: 700; }
    #tv-ios-hint .tv-ios-hint-share {
      display: inline-flex; vertical-align: -3px; width: 16px; height: 16px; margin: 0 2px;
    }
    #tv-ios-hint .tv-ios-hint-share svg { width: 16px; height: 16px; stroke: #2d6a4f; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    #tv-ios-hint .tv-ios-hint-sub { color: #6b7280; font-size: 12px; margin-top: 2px; }
    #tv-ios-hint .tv-ios-hint-close {
      flex-shrink: 0; align-self: flex-start; background: transparent; border: none;
      color: #9ca3af; font-size: 20px; line-height: 1; cursor: pointer; padding: 2px 4px;
    }
    #tv-ios-hint .tv-ios-hint-close:active { color: #111827; }
  `;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'tv-ios-hint';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Install Tradevoice');
  el.innerHTML = `
    <div class="tv-ios-hint-mark">TV</div>
    <div class="tv-ios-hint-body">
      <div>Install Tradevoice — tap
        <span class="tv-ios-hint-share" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span>
        then <b>Add to Home Screen</b></div>
      <div class="tv-ios-hint-sub">Full-screen, and it keeps working offline in the field.</div>
    </div>
    <button class="tv-ios-hint-close" aria-label="Dismiss">&times;</button>
  `;
  document.body.appendChild(el);

  el.querySelector('.tv-ios-hint-close').addEventListener('click', () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    el.remove();
  });

  // If they install while the hint is up (display-mode flips), remove it.
  try {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) el.remove();
    });
  } catch { /* older iOS lacks addEventListener on MQL */ }
}
