/**
 * Deletes ALL Supabase auth users whose email ends with @staff.arit.local
 * AND cleans up their staff_profiles rows.
 *
 * Run from the project root:
 *   node scripts/delete-staff-users.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dependency needed)
// ---------------------------------------------------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("    Make sure .env.local exists in the project root.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🔍  Fetching all auth users…");

  // Supabase listUsers is paginated — fetch all pages
  let allUsers = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error("❌  listUsers failed:", error.message); process.exit(1); }
    allUsers = allUsers.concat(data.users);
    if (data.users.length < 1000) break;
    page++;
  }

  const staffUsers = allUsers.filter((u) =>
    u.email && u.email.endsWith("@staff.arit.local")
  );

  if (staffUsers.length === 0) {
    console.log("✅  No staff users found — nothing to delete.");
    return;
  }

  console.log(`\n🗑️  Found ${staffUsers.length} staff user(s) to delete:\n`);
  for (const u of staffUsers) {
    console.log(`  • ${u.email}  (${u.id})`);
  }

  console.log("\n⚠️  Deleting in 3 seconds… Ctrl+C to abort.\n");
  await new Promise((r) => setTimeout(r, 3000));

  let deleted = 0;
  let failed = 0;

  for (const u of staffUsers) {
    // Delete from staff_profiles first (FK safety)
    await admin.from("staff_profiles").delete().eq("auth_user_id", u.id);

    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) {
      console.error(`  ❌  Failed to delete ${u.email}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✅  Deleted ${u.email}`);
      deleted++;
    }
  }

  console.log(`\nDone. ${deleted} deleted, ${failed} failed.`);
  console.log("The staff_assignments rows that pointed to these profiles are now orphaned.");
  console.log("Refresh your dashboard — the roster will be empty and ready for a clean start.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
