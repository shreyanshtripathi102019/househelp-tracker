import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const householdName = String(body.householdName || "").trim() || "My Household";
  const slug = `${slugify(householdName)}-${Date.now().toString(36)}`;

  // Use admin client so RLS never blocks the insert.
  // owner_user_id is explicitly tied to the verified user so it remains secure.
  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("households")
    .insert({ name: householdName, slug, owner_user_id: user.id })
    .select("id, name")
    .single();

  if (error) {
    console.error("POST /api/household insert error", JSON.stringify(error));
    return NextResponse.json(
      { error: `DB error: ${error.message} (code: ${error.code})` },
      { status: 500 }
    );
  }

  console.log("POST /api/household created", inserted);
  return NextResponse.json({ ok: true, household: inserted });
}
