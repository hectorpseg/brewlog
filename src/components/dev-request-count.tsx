"use client";
import { useEffect, useState } from "react";
import { getRequestCounts, getRequestLog, patchFetch, resetRequestCounts } from "@/lib/supabase/request-log";

// Dev-only floating counter for client-side Supabase traffic.
// Tap to reset and print the per-interaction breakdown to the console.
export function DevRequestCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    patchFetch("client");
    const t = setInterval(() => setCount(getRequestCounts().client), 500);
    return () => clearInterval(t);
  }, []);
  if (process.env.NODE_ENV === "production") return null;
  return (
    <button
      type="button"
      title="Client Supabase requests this session. Tap to log breakdown + reset."
      onClick={() => {
        console.debug("[supabase:client] breakdown since reset:", getRequestLog());
        resetRequestCounts();
        setCount(0);
      }}
      className="tnum fixed right-2 top-2 z-50 min-h-8 rounded-full border border-line bg-card px-3 text-xs text-ink2"
    >
      sb: {count}
    </button>
  );
}
