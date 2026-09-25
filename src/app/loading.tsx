import Image from "next/image";

// ponytail: top-level App Router loading boundary = branded BrewLog splash.
// Shown while entering top-level routes (e.g. /brews). Per-route skeletons,
// autosave, buttons and inline states are separate patterns and untouched.
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading BrewLog"
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 py-16"
    >
      {/* ponytail: SMIL inside the svg animates itself, no JS needed */}
      <Image
        src="/splash.svg"
        alt=""
        aria-hidden="true"
        width={256}
        height={256}
        priority
        className="h-64 w-64"
      />
      <p className="font-display text-xl text-ink2">BrewLog</p>
    </div>
  );
}
