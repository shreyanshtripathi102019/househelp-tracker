import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/env";

// Admin client uses the service-role key. This MUST never reach the browser.
// Used only inside server actions / route handlers when we need to provision
// staff users (creating auth.users rows, resetting their PIN, etc.).
export function createAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
