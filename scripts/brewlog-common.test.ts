import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadCliEnv, resolveConfig } from "./brewlog-common";

// Fake values only — these tests never touch the real .env.local.
const saved = new Map<string, string | undefined>();
function stash(key: string) {
  if (!saved.has(key)) saved.set(key, process.env[key]);
}
function set(key: string, value: string | undefined) {
  stash(key);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  saved.clear();
});

function tempDirWith(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "brewlog-env-"));
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
  return dir;
}
function cleanup(dir: string) {
  rmSync(dir, { recursive: true, force: true });
}

describe("loadCliEnv", () => {
  // Vitest runs under NODE_ENV=test, where Next.js semantics skip .env.local.
  // The real CLI never runs that way, so tests opt into development instead.
  function asDevCli() {
    set("NODE_ENV", "development");
  }
  it("loads .env.local into process.env like the Next.js runtime", () => {
    const dir = tempDirWith({
      ".env.local": "BREWLOG_EMAIL=cli@example.com\nBREWLOG_PASSWORD=s3cret\n",
    });
    try {
      asDevCli();
      set("BREWLOG_EMAIL", undefined);
      set("BREWLOG_PASSWORD", undefined);
      loadCliEnv(dir);
      expect(process.env.BREWLOG_EMAIL).toBe("cli@example.com");
      expect(process.env.BREWLOG_PASSWORD).toBe("s3cret");
    } finally {
      cleanup(dir);
    }
  });
  it("prefers .env.local over .env", () => {
    const dir = tempDirWith({
      ".env": "BREWLOG_EMAIL=base@example.com\n",
      ".env.local": "BREWLOG_EMAIL=local@example.com\n",
    });
    try {
      asDevCli();
      set("BREWLOG_EMAIL", undefined);
      loadCliEnv(dir);
      expect(process.env.BREWLOG_EMAIL).toBe("local@example.com");
    } finally {
      cleanup(dir);
    }
  });
  it("never overrides a real environment variable with a file value", () => {
    const dir = tempDirWith({
      ".env.local": "BREWLOG_EMAIL=file@example.com\n",
    });
    try {
      asDevCli();
      set("BREWLOG_EMAIL", "real@example.com");
      loadCliEnv(dir);
      expect(process.env.BREWLOG_EMAIL).toBe("real@example.com");
    } finally {
      cleanup(dir);
    }
  });
});

describe("resolveConfig", () => {
  it("reads credentials from the loaded environment (no separate file map)", () => {
    const config = resolveConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub",
      BREWLOG_EMAIL: "cli@example.com",
      BREWLOG_PASSWORD: "s3cret",
    });
    expect(config).toEqual({
      url: "https://x.supabase.co",
      anonKey: "pub",
      email: "cli@example.com",
      password: "s3cret",
    });
  });
  it("keeps the legacy anon-key fallback", () => {
    const config = resolveConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      BREWLOG_EMAIL: "e",
      BREWLOG_PASSWORD: "p",
    });
    expect(config.anonKey).toBe("anon");
  });
  it("names missing keys without ever echoing values", () => {
    let message = "";
    try {
      resolveConfig({ BREWLOG_EMAIL: "cli@example.com" });
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toContain("BREWLOG_PASSWORD");
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain("cli@example.com");
  });
});
