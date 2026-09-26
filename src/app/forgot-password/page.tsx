import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/require-user";
import { ForgotPasswordForm } from "./form";

export default async function ForgotPasswordPage() {
  // Already signed in means no reset is needed; same rule as /login.
  const user = await getCachedUser();
  if (user) redirect("/brews");
  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl">Reset password</h1>
      <p className="mb-4 mt-1 text-sm text-ink2">
        Enter your account email and we will send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
