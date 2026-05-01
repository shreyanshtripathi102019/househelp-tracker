"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["present", "absent", "leave"]);

export async function createHouseholdAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const householdName = String(formData.get("householdName") || "").trim() || "My Household";
  const cookName = String(formData.get("cookName") || "").trim() || "Cook";
  const cleanerName = String(formData.get("cleanerName") || "").trim() || "Cleaner";
  const slug = `${slugify(householdName)}-${Date.now().toString(36)}`;

  // Generate the household id client-side so we do NOT need a SELECT/RETURNING
  // after the insert. The households SELECT RLS policy depends on the user
  // being a member, but we have not inserted that membership row yet, so the
  // RETURNING clause would come back empty and break the setup flow.
  const householdId =
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : null) || generateUuidFallback();

  const { error: householdError } = await supabase
    .from("households")
    .insert({
      id: householdId,
      name: householdName,
      slug,
    });

  if (householdError) {
    redirectWithSetupError("household", householdError);
  }

  const { error: membershipError } = await supabase.from("household_members").insert({
    household_id: householdId,
    user_id: user.id,
    role: "owner",
    invited_name: user.email,
  });

  if (membershipError) {
    redirectWithSetupError("membership", membershipError);
  }

  const { error: workerError } = await supabase
    .from("workers")
    .insert([
      {
        household_id: householdId,
        display_name: cookName,
        category: "cook",
      },
      {
        household_id: householdId,
        display_name: cleanerName,
        category: "cleaner",
      },
    ]);

  if (workerError) {
    redirectWithSetupError("workers", workerError);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveAttendanceAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const workerId = String(formData.get("workerId") || "").trim();
  const attendanceDate = String(formData.get("attendanceDate") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!workerId || !attendanceDate || !VALID_STATUSES.has(status)) {
    revalidatePath("/dashboard");
    return;
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role === "worker") {
    revalidatePath("/dashboard");
    return;
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("id, household_id")
    .eq("id", workerId)
    .eq("household_id", membership.household_id)
    .single();

  if (!worker) {
    revalidatePath("/dashboard");
    return;
  }

  await supabase.from("attendance_records").upsert(
    {
      household_id: worker.household_id,
      worker_id: worker.id,
      attendance_date: attendanceDate,
      status,
      note: note || null,
      marked_by: user.id,
    },
    {
      onConflict: "worker_id,attendance_date",
    }
  );

  revalidatePath("/dashboard");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function generateUuidFallback() {
  // RFC4122 v4 fallback for very old runtimes that lack crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function redirectWithSetupError(stage, error) {
  const detail = buildErrorDetail(error);

  console.error(`createHouseholdAction:${stage}`, {
    code: error?.code || null,
    message: error?.message || null,
    details: error?.details || null,
    hint: error?.hint || null,
  });

  redirect(`/dashboard?error=${stage}&detail=${encodeURIComponent(detail)}`);
}

function buildErrorDetail(error) {
  const pieces = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ].filter(Boolean);

  if (!pieces.length) {
    return "Unknown database error";
  }

  return pieces.join(" | ").slice(0, 240);
}
