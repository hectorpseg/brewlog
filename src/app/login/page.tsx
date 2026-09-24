import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { safeNext } from "@/lib/auth";
import { getCachedUser } from "@/lib/supabase/require-user";
import { Button, Card, Input, Label } from "@/components/ui/controls";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  // Auth shell: already signed in means the login form is the wrong screen.
  // One cached getUser read, shared with any other caller in this render.
  const user = await getCachedUser();
  if (user) redirect(next);
  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl">BrewLog</h1>
      <p className="mb-4 mt-1 text-sm text-ink2">A private brew notebook. Sign in to continue.</p>
      {sp.error ? (
        <p role="alert" className="mb-3 rounded-[10px] border border-ember px-3 py-2 text-sm text-ember">
          {sp.error}
        </p>
      ) : null}
      <Card>
        <form className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <div className="flex gap-2">
            <Button formAction={login}>Sign in</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
