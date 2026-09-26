"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "@/components/ui/controls";

type Status = "checking" | "ready" | "invalid" | "signed-in";

const MIN_PASSWORD_LENGTH = 8;

function validate(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

// ponytail: one small form, no hook-form/zod — two fields need neither.
export function UpdatePasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The form unlocks only on a recovery session: either the PASSWORD_RECOVERY
  // event or a successful ?code= exchange (which emits that event). A plain
  // signed-in visit or an expired link keeps the form locked.
  useEffect(() => {
    const db = createClient();
    let cancelled = false;
    const { data: sub } = db.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
      else if (event === "SIGNED_OUT") setStatus("invalid");
    });
    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        window.history.replaceState(null, "", "/update-password");
        if (error) setStatus("invalid");
        // success emits PASSWORD_RECOVERY, which flips status to ready
        return;
      }
      if (window.location.hash.includes("access_token")) {
        // Implicit flow: the client parsed the recovery fragment on creation.
        const { data } = await db.auth.getSession();
        if (cancelled) return;
        setStatus(data.session ? "ready" : "invalid");
        return;
      }
      const { data } = await db.auth.getUser();
      if (cancelled) return;
      setStatus(data.user ? "signed-in" : "invalid");
    })();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || done) return;
    const problem = validate(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    const db = createClient();
    const { error } = await db.auth.updateUser({ password });
    if (error) {
      setPending(false);
      setError("Could not update the password. The link may have expired - request a new one below.");
      return;
    }
    setDone(true);
    await db.auth.signOut();
    setTimeout(() => router.replace("/login?updated=1"), 1500);
  }

  if (status === "checking") {
    return (
      <Card>
        <p role="status" className="text-sm text-ink2">Checking your reset link...</p>
      </Card>
    );
  }

  if (status === "signed-in") {
    return (
      <Card>
        <p className="text-sm">
          You are already signed in. This page is only for choosing a new password from an email reset link.
        </p>
        <Link href="/brews" className="mt-3 inline-block min-h-11 py-2 text-sm underline">
          Back to your brews
        </Link>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card>
        <p role="alert" className="text-sm">
          This reset link is invalid or has expired. Reset links are single-use and time-limited.
        </p>
        <Link href="/forgot-password" className="mt-3 inline-block min-h-11 py-2 text-sm underline">
          Request another reset link
        </Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <p role="status" className="text-sm">
          Password updated. Taking you back to sign in with your new password...
        </p>
      </Card>
    );
  }

  const fieldType = show ? "text" : "password";
  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={fieldType}
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-ink2"
            >
              {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type={fieldType}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-[10px] border border-ember px-3 py-2 text-sm text-ember">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
