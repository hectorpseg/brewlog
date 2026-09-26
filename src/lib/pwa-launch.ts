// Standalone-PWA launch splash decisions, kept framework-free so the rules
// are unit-testable without a browser. The component
// (components/launch-splash) only wires these to timers and the
// visibility API. Route loading (app/loading.tsx) is untouched by design.

// How long the splash stays fully visible once shown. Short branding beat:
// shell hydration already happened by mount, so this is polish, not a wait.
export const LAUNCH_SPLASH_SHOW_MS = 700;
// Fade-out length. Zero readable cost, skipped under reduced motion.
export const LAUNCH_SPLASH_FADE_MS = 200;
// Backgrounded shorter than this = quick app switch, no splash on return.
export const BACKGROUND_IDLE_MS = 60_000;

export type StandaloneEnv = {
  matchDisplayMode: (query: string) => boolean;
  iosStandalone?: boolean;
};

// ponytail: two signals ORed. display-mode covers modern browsers;
// navigator.standalone is the iOS Home Screen PWA signal (incl. older iOS).
export function isStandalonePwa(env: StandaloneEnv): boolean {
  return env.matchDisplayMode("(display-mode: standalone)") || env.iosStandalone === true;
}

export function readsStandalonePwa(): boolean {
  return isStandalonePwa({
    matchDisplayMode: (q) => window.matchMedia(q).matches,
    iosStandalone: (window.navigator as Navigator & { standalone?: boolean }).standalone,
  });
}

// Re-entry splash only after a meaningful backgrounding. Pure duration
// check so short interruptions (<60s) never flash the brand.
export function shouldShowReentrySplash(hiddenForMs: number): boolean {
  return hiddenForMs >= BACKGROUND_IDLE_MS;
}
