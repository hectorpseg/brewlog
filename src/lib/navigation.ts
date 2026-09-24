import { Coffee, FlaskConical, FlaskRound, Layers, Package, Scale, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ponytail: the only curated destination lists in the app. A feature shipping
// does not earn a bottom tab — tabs are the recurring mid-brew workflow
// (Brews, Coffees, Cuppings) plus the + Brew action. Everything else
// (sessions, compare, account; experiments via their brew) stays one tap
// deeper under More or in context. Future routes (espresso, locales) add
// entries here; promoting one to PRIMARY_TABS needs a workflow reason, not
// just existence.

// ponytail: brew methods stay free-text fields on the brew (dripper, grinder,
// filter), never a Method entity — a future espresso mode adds one entry
// here plus an optional method field, not a new navigation tree.

export type NavLink = { href: string; label: string; Icon: LucideIcon };
export type MoreLink = NavLink & { body: string };

export const PRIMARY_TABS: NavLink[] = [
  { href: "/brews", label: "Brews", Icon: Coffee },
  { href: "/coffees", label: "Coffees", Icon: Package },
  { href: "/cuppings", label: "Cuppings", Icon: FlaskConical },
];

export const MORE_LINKS: MoreLink[] = [
  { href: "/sessions", label: "Sessions", body: "Group brews into explorations and phases.", Icon: Layers },
  { href: "/experiments", label: "Experiments", body: "Group brews around a question you are testing.", Icon: FlaskRound },
  { href: "/brews/compare", label: "Compare brews", body: "Side-by-side recipe and cup differences.", Icon: Scale },
  { href: "/account", label: "Account", body: "Sign-in and competition target.", Icon: User },
];

// Overflow destinations highlight the More tab instead of a primary tab.
export const MORE_PREFIXES = ["/more", "/sessions", "/account", "/experiments"];

// Auth shell: no app chrome here. "/" redirects immediately (see app/page),
// so hiding the nav there avoids a one-frame authenticated flash.
export const PUBLIC_PATHS = ["/", "/login"];

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p);
}

export function isMorePath(path: string): boolean {
  return MORE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isTabPath(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}
