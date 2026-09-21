// Deep links survive auth: protected pages send unauthenticated users to
// /login?next=<path>, and login returns them there. Relative paths only,
// so a crafted ?next= can never bounce to an external site.
export function safeNext(v: string | null | undefined): string {
  const s = v ?? "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/coffees";
}

export function loginUrl(path: string): string {
  return `/login?next=${encodeURIComponent(path)}`;
}
