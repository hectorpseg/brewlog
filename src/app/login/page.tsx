import { login, signup } from "@/app/actions";
import { Button, Card, Input, Label } from "@/components/ui/controls";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="pt-10">
      <h1 className="text-2xl font-semibold">BrewLog</h1>
      <p className="mb-4 text-sm text-zinc-600">Private brew journal. Sign in to continue.</p>
      {sp.error ? <p className="mb-3 text-sm text-red-600">{sp.error}</p> : null}
      <Card>
        <form className="flex flex-col gap-3">
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
            <Button variant="ghost" formAction={signup}>Sign up</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
