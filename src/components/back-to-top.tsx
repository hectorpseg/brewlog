"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Appears only after real scrolling, floats above the bottom nav, never
// auto-added: parents render it solely on genuinely long pages.
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
      className="fixed bottom-20 right-4 z-10 grid min-h-11 min-w-11 place-items-center rounded-full border border-line bg-card text-ink2"
    >
      <ArrowUp size={20} aria-hidden />
    </button>
  );
}
