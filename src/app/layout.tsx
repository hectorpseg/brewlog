import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { DevRequestCount } from "@/components/dev-request-count";
import { LaunchSplash } from "@/components/launch-splash";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const display = Source_Serif_4({ variable: "--font-display", subsets: ["latin"] });

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved on the server (cookie > Accept-Language > English) and handed to
  // the client provider, so <html lang> and every translated label agree
  // between server and client — no hydration mismatch.
  const locale = await getLocale();
  return (
    <html lang={locale} className={`h-full ${display.variable}`}>
      <body className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-ink">
        <LocaleProvider locale={locale}>
          {process.env.NODE_ENV !== "production" ? <DevRequestCount /> : null}
          <LaunchSplash />
          <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
          <BottomNav />
        </LocaleProvider>
      </body>
    </html>
  );
}
