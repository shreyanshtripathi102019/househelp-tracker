"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateStaffCode,
  generateStaffPin,
  staffEmailFromCode,
} from "@/lib/staff-auth";

const VALID_STATUSES = new Set(["present", "absent", "leave", "half_day"]);
const VALID_ROLES = new Set(["cook", "cleaner", "nanny", "driver", "other"]);
const VALID_LEAVE_DECISIONS = new Set(["approved", "rejected"]);

// ---------------------------------------------------------------------------
// First-time setup: create the household.
// ---------------------------------------------------------------------------
export async function createHouseholdAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  const householdName =
    String(formData.get("householdName") || "").trim() || "My Household";
  const slug = `${slugify(householdName)}-${Date.now().toString(36)}`;

  const householdId = randomUuid();

  const { error } = await supabase.from("households").insert({
    id: householdId,
    name: householdName,
    slug,
    owner_user_id: user.id,
  });

  if (error) {
    redirectWithError("household", error);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Add a staff member: creates a Supabase auth user + staff_profile + assignment.
// Returns the freshly generated code + PIN through the URL so the owner can
// copy it (we never store the plaintext PIN ourselves).
// ---------------------------------------------------------------------------
export async function addStaffAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const monthlySalaryRaw = String(formData.get("monthlySalary") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const reuseStaffCode = String(formData.get("reuseStaffCode") || "")
    .trim()
    .toUpperCase();

  if (!fullName && !reuseStaffCode) {
    redirectWithError("staff", { message: "Name is required for a new staff." });
  }

  if (!VALID_ROLES.has(role)) {
    redirectWithError("staff", { message: "Pick a valid role." });
  }

  // Find owner's household
  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!household) {
    redirectWithError("staff", { message: "Create a household first." });
  }

  const monthlySalary = monthlySalaryRaw ? Number(monthlySalaryRaw) : null;
  if (monthlySalaryRaw && Number.isNaN(monthlySalary)) {
    redirectWithError("staff", { message: "Salary must be a number." });
  }

  const admin = createAdminClient();

  let staffProfileId;
  let staffCode;
  let plaintextPin = null;
  let mode = "new";

  if (reuseStaffCode) {
    // Owner is attaching an existing staff (by code) to their household.
    const { data: existing, error: lookupError } = await admin
      .from("staff_profiles")
      .select("id, staff_code, full_name")
      .eq("staff_code", reuseStaffCode)
      .maybeSingle();

    if (lookupError || !existing) {
      redirectWithError("staff", {
        message: "No staff found with that code. Ask them to read it again.",
      });
    }

    staffProfileId = existing.id;
    staffCode = existing.staff_code;
    mode = "reuse";
  } else {
    // Provision a brand-new staff: auth user → profile.
    staffCode = generateStaffCode();
    plaintextPin = generateStaffPin();
    const email = staffEmailFromCode(staffCode);

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: plaintextPin,
        email_confirm: true,
        user_metadata: {
          role: "staff",
          full_name: fullName,
        },
      });

    if (createError || !created?.user) {
      redirectWithError("staff", createError || { message: "Auth provision failed." });
    }

    const { data: profile, error: profileError } = await admin
      .from("staff_profiles")
      .insert({
        auth_user_id: created.user.id,
        staff_code: staffCode,
        full_name: fullName,
        phone: phone || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      // Roll back the auth user so we don't leak orphans
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      redirectWithError("staff", profileError || { message: "Profile insert failed." });
    }

    staffProfileId = profile.id;
  }

  // Create the assignment. If one already exists for this household + staff,
  // upsert to update fields rather than failing on the unique constraint.
  const { error: assignError } = await admin.from("staff_assignments").upsert(
    {
      household_id: household.id,
      staff_profile_id: staffProfileId,
      role,
      monthly_salary: monthlySalary,
      start_date: startDate || null,
      is_active: true,
    },
    { onConflict: "household_id,staff_profile_id" }
  );

  if (assignError) {
    redirectWithError("staff", assignError);
  }

  revalidatePath("/dashboard");

  if (plaintextPin) {
    const sp = new URLSearchParams({
      staffCode,
      staffPin: plaintextPin,
      staffName: fullName,
      staffMode: "new",
    });
    redirect(`/dashboard?${sp.toString()}`);
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Reset PIN for an existing staff (owner action).
// ---------------------------------------------------------------------------
export async function resetStaffPinAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  if (!assignmentId) {
    redirectWithError("pin", { message: "Missing assignment id." });
  }

  // Verify owner has rights through their household
  const { data: assignment } = await supabase
    .from("staff_assignments")
    .select(
      "id, household_id, staff_profiles(id, auth_user_id, staff_code, full_name)"
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment || !assignment.staff_profiles) {
    redirectWithError("pin", { message: "Staff not found." });
  }

  const newPin = generateStaffPin();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(
    assignment.staff_profiles.auth_user_id,
    { password: newPin }
  );

  if (error) {
    redirectWithError("pin", error);
  }

  revalidatePath("/dashboard");
  const sp = new URLSearchParams({
    staffCode: assignment.staff_profiles.staff_code,
    staffPin: newPin,
    staffName: assignment.staff_profiles.full_name,
    staffMode: "reset",
  });
  redirect(`/dashboard?${sp.toString()}`);
}

// ---------------------------------------------------------------------------
// Remove (deactivate) a staff assignment from this household.
// We do not delete the staff_profile so they can still log in for other homes.
// ---------------------------------------------------------------------------
export async function deactivateAssignmentAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  if (!assignmentId) {
    redirectWithError("remove", { message: "Missing assignment id." });
  }

  const { error } = await supabase
    .from("staff_assignments")
    .update({ is_active: false })
    .eq("id", assignmentId);

  if (error) {
    redirectWithError("remove", error);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Mark / change attendance for a single (assignment, date).
// ---------------------------------------------------------------------------
export async function saveAttendanceAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  const attendanceDate = String(formData.get("attendanceDate") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!assignmentId || !attendanceDate || !VALID_STATUSES.has(status)) {
    revalidatePath("/dashboard");
    return;
  }

  await supabase.from("attendance_records").upsert(
    {
      assignment_id: assignmentId,
      attendance_date: attendanceDate,
      status,
      note: note || null,
      marked_by: user.id,
    },
    { onConflict: "assignment_id,attendance_date" }
  );

  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Approve or reject a leave. Approval also writes 'leave' attendance
// records for each day in the range.
// ---------------------------------------------------------------------------
export async function decideLeaveAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  const leaveId = String(formData.get("leaveId") || "").trim();
  const decision = String(formData.get("decision") || "").trim();

  if (!leaveId || !VALID_LEAVE_DECISIONS.has(decision)) {
    redirectWithError("leave", { message: "Invalid leave decision." });
  }

  const { data: leave, error: fetchError } = await supabase
    .from("leave_requests")
    .select("id, assignment_id, start_date, end_date, status")
    .eq("id", leaveId)
    .maybeSingle();

  if (fetchError || !leave) {
    redirectWithError("leave", fetchError || { message: "Leave not found." });
  }

  if (leave.status !== "pending") {
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  const { error: updateError } = await supabase
    .from("leave_requests")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", leaveId);

  if (updateError) {
    redirectWithError("leave", updateError);
  }

  if (decision === "approved") {
    const days = enumerateDates(leave.start_date, leave.end_date);
    if (days.length) {
      const rows = days.map((d) => ({
        assignment_id: leave.assignment_id,
        attendance_date: d,
        status: "leave",
        note: "Auto from approved leave request",
        marked_by: user.id,
      }));
      await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "assignment_id,attendance_date" });
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function randomUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function enumerateDates(startDate, endDate) {
  const out = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function redirectWithError(stage, error) {
  const detail = buildErrorDetail(error);
  console.error(`owner action error [${stage}]`, {
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
  if (!pieces.length) return "Unknown error";
  return pieces.join(" | ").slice(0, 240);
}
