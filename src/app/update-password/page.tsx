import { UpdatePasswordForm } from "./form";

// ponytail: intentionally no auth check here. A recovery link IS a session,
// so a server-side "already signed in, redirect" would lock out the exact
// user this page exists for. This page renders no app content either way.
export default function UpdatePasswordPage() {
  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl">Choose a new password</h1>
      <p className="mb-4 mt-1 text-sm text-ink2">
        Enter a new password for your account below.
      </p>
      <UpdatePasswordForm />
    </div>
  );
}
