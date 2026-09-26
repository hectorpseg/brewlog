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

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const show = useCallback(() => {
    if (showing.current) return;
    showing.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRender(true);
    setVisible(true);
    // Mount = shell hydrated, so readiness is already met; this beat is
    // branding only and never waits on Supabase/database queries.
    later(() => {
      if (reduced) {
        setVisible(false);
        setRender(false);
        showing.current = false;
        return;
      }
      setVisible(false);
      later(() => {
        setRender(false);
        showing.current = false;
      }, LAUNCH_SPLASH_FADE_MS);
    }, reduced ? 0 : LAUNCH_SPLASH_SHOW_MS);
  }, [later]);

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
