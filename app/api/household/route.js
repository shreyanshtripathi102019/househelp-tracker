import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("households").insert({
    name: householdName,
    slug,
    owner_user_id: user.id,
  });

  if (error) {
    console.error("POST /api/household error", error);
    return NextResponse.json(
      { error: error.message || "Could not create household" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
