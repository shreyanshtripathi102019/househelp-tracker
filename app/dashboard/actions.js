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

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name: householdName,
      slug,
    })
    .select("id")
    .single();

  if (householdError || !household) {
    redirect("/dashboard?error=household");
  }

  const { error: workerError } = await supabase
    .from("workers")
    .insert([
      {
        household_id: household.id,
        display_name: cookName,
        category: "cook",
      },
      {
        household_id: household.id,
        display_name: cleanerName,
        category: "cleaner",
      },
    ])
    .select("id");

  if (workerError) {
    redirect("/dashboard?error=workers");
  }

  const { error: membershipError } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: user.id,
    role: "owner",
    invited_name: user.email,
  });

  if (membershipError) {
    redirect("/dashboard?error=membership");
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
