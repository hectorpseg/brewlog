"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LAUNCH_SPLASH_FADE_MS,
  LAUNCH_SPLASH_SHOW_MS,
  readsStandalonePwa,
  shouldShowReentrySplash,
} from "@/lib/pwa-launch";

// ponytail: standalone-PWA lifecycle overlay, deliberately separate from
// route loading (app/loading.tsx owns that). Fixed overlay = zero layout
// shift; server and first client render match. CSS exposes the SSR overlay in
// standalone mode and JS hides it in browser tabs. Purely visual: never
// navigates or touches auth or data, so startup and re-entry preserve the
// current route and form state.
export function LaunchSplash() {
  const [visible, setVisible] = useState(true);
  const timers = useRef<number[]>([]);
  const showing = useRef(true);
  const hiddenAt = useRef(0);
  const loadHandler = useRef<(() => void) | null>(null);
  const overlay = useRef<HTMLDivElement>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const hide = useCallback(() => {
    loadHandler.current = null;
    setVisible(false);
    later(() => {
      showing.current = false;
    }, LAUNCH_SPLASH_FADE_MS);
  }, [later]);

  const show = useCallback(() => {
    if (showing.current) return;
    showing.current = true;
    if (overlay.current) overlay.current.style.display = "flex";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setVisible(true);
    // Re-entry waits for the shell only; route changes keep their own
    // skeletons rather than turning the splash into a navigation loader.
    later(() => {
      if (reduced) {
        setVisible(false);
        showing.current = false;
        return;
      }
      // ponytail: SHOW_MS equals the single-play SVG duration, so the
      // animation always finishes naturally. Slow init holds the frozen
      // final frame (fill=freeze) until window load; never replays.
      if (document.readyState === "complete") {
        hide();
        return;
      }
      loadHandler.current = hide;
      window.addEventListener("load", hide, { once: true });
    }, reduced ? 0 : LAUNCH_SPLASH_SHOW_MS);
  }, [later, hide]);

  useEffect(() => {
    const el = overlay.current;
    if (readsStandalonePwa()) {
      // Legacy iOS reports navigator.standalone without supporting the
      // display-mode media query; force the overlay visible when JS sees it.
      if (el) el.style.display = "flex";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const waitForReady = () => {
        if (document.readyState === "complete") {
          hide();
          return;
        }
        loadHandler.current = hide;
        window.addEventListener("load", hide, { once: true });
      };
      // ponytail: SSR paints the overlay before hydration; load marks the end
      // of the initial streamed route, not background fetches.
      later(waitForReady, reduced ? 0 : LAUNCH_SPLASH_SHOW_MS);
    } else if (el) {
      // Browser tabs are already hidden by the standalone-only CSS gate.
      el.style.display = "none";
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const hiddenFor = hiddenAt.current > 0 ? Date.now() - hiddenAt.current : 0;
      hiddenAt.current = 0;
      if (readsStandalonePwa() && shouldShowReentrySplash(hiddenFor)) show();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (loadHandler.current) window.removeEventListener("load", loadHandler.current);
      loadHandler.current = null;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      showing.current = false;
    };
  }, [hide, later, show]);

  return (
    <div
      ref={overlay}
      role="status"
      aria-label="Loading BrewLog"
      aria-hidden={!visible}
      className="launch-splash fixed inset-0 z-50 flex-col items-center justify-center gap-6 bg-paper px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* ponytail: plain img, not next/image — static local SVG, zero JS */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/splash.svg" alt="" aria-hidden="true" width={256} height={256} className="h-64 w-64 max-h-[50dvh] max-w-[70vw]" />
      <p className="font-display text-xl text-ink2">BrewLog</p>
    </div>
  );
}
