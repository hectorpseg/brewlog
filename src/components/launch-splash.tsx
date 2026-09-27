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
// shift; renders null on server and first client paint = no hydration
// mismatch. Purely visual: never navigates, never touches auth or data, so
// re-entry preserves route and form state by construction.
export function LaunchSplash() {
  const [render, setRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);
  const showing = useRef(false);
  const hiddenAt = useRef(0);
  const loadHandler = useRef<(() => void) | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const hide = useCallback(() => {
    loadHandler.current = null;
    setVisible(false);
    later(() => {
      setRender(false);
      showing.current = false;
    }, LAUNCH_SPLASH_FADE_MS);
  }, [later]);

  const show = useCallback(() => {
    if (showing.current) return;
    showing.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRender(true);
    setVisible(true);
    // Mount = shell hydrated; route data still loads under its own
    // skeletons (never the splash). No Supabase/database wait here.
    later(() => {
      if (reduced) {
        setVisible(false);
        setRender(false);
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
    if (readsStandalonePwa()) show();
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
  }, [show]);

  if (!render) return null;
  return (
    <div
      role="status"
      aria-label="Loading BrewLog"
      aria-hidden={!visible}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-paper px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
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
