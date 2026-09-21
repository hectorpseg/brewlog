import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLog",
  description: "Private brew journal for coffee experiments",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BrewLog", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#18181b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="mx-auto flex min-h-full w-full max-w-md flex-col bg-zinc-50 text-zinc-900">
        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-zinc-200 bg-white px-4 pb-[env(safe-area-inset-bottom)] pt-2">
          <div className="flex justify-around text-sm">
            <Link className="min-h-11 px-3 py-2" href="/coffees">Coffees</Link>
            <Link className="min-h-11 px-3 py-2" href="/brews">Brews</Link>
            <Link className="min-h-11 px-3 py-2" href="/sessions">Sessions</Link>
            <Link className="min-h-11 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white" href="/brews/new">+ Brew</Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
