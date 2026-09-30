import { Coffee, FlaskConical, Layers, Package, Scale, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "./i18n/dictionaries";

// ponytail: the only curated destination lists in the app. A feature shipping
// does not earn a bottom tab — tabs are the recurring mid-brew workflow
// (Brews, Coffees, Cuppings) plus the + Brew action. Everything else
// (sessions, compare, account) stays one tap deeper under More or in
// context. Future routes (espresso, locales) add entries here; promoting one
// to PRIMARY_TABS needs a workflow reason, not just existence.

// ponytail: brew methods stay free-text fields on the brew (dripper, grinder,
// filter), never a Method entity — a future espresso mode adds one entry
// here plus an optional method field, not a new navigation tree.

// Labels and descriptions are translation keys (UI concepts), never stored
// data; callers with a translator resolve them (getT on the server, useT on
// the client).
export type NavLink = { href: string; labelKey: TranslationKey; Icon: LucideIcon };
export type MoreLink = NavLink & { bodyKey: TranslationKey };

export const PRIMARY_TABS: NavLink[] = [
  { href: "/brews", labelKey: "nav.brews", Icon: Coffee },
  { href: "/coffees", labelKey: "nav.coffees", Icon: Package },
  { href: "/cuppings", labelKey: "nav.cuppings", Icon: FlaskConical },
];

export const MORE_LINKS: MoreLink[] = [
  { href: "/sessions", labelKey: "nav.sessions", bodyKey: "nav.sessions.body", Icon: Layers },
  { href: "/brews/compare", labelKey: "nav.compare", bodyKey: "nav.compare.body", Icon: Scale },
  { href: "/account", labelKey: "nav.account", bodyKey: "nav.account.body", Icon: User },
];

// Overflow destinations highlight the More tab instead of a primary tab.
// /brews/compare lives under More even though its path nests under /brews.
export const MORE_PREFIXES = ["/more", "/sessions", "/account", "/brews/compare"];

// Auth shell: no app chrome here. "/" redirects immediately (see app/page),
// so hiding the nav there avoids a one-frame authenticated flash.
// Forgot/update-password are public too: they must never show app content.
export const PUBLIC_PATHS = ["/", "/login", "/forgot-password", "/update-password"];

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p);
}

export function isMorePath(path: string): boolean {
  return MORE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isTabPath(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}
