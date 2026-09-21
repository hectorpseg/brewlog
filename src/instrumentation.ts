export async function register() {
  if (process.env.NODE_ENV !== "production") {
    const { patchFetch } = await import("@/lib/supabase/request-log");
    patchFetch("server");
  }
}
