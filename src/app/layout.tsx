import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { DevRequestCount } from "@/components/dev-request-count";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });

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
  themeColor: "#faf7f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${display.variable}`}>
      <body className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-ink">
        {process.env.NODE_ENV !== "production" ? <DevRequestCount /> : null}
        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
