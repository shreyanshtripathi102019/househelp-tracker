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

// Shared helper — verify identity and return user + admin client.
async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in/owner");
  return { user, admin: createAdminClient() };
}

// ---------------------------------------------------------------------------
// Add a staff member
// ---------------------------------------------------------------------------
export async function addStaffAction(formData) {
  const { user, admin } = await getAuthContext();

  const fullName = String(formData.get("fullName") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const monthlySalaryRaw = String(formData.get("monthlySalary") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const reuseStaffCode = String(formData.get("reuseStaffCode") || "")
    .trim()
    .toUpperCase();

  if (!fullName && !reuseStaffCode)
    redirectWithError("staff", { message: "Name is required for a new staff." });
  if (!VALID_ROLES.has(role))
    redirectWithError("staff", { message: "Pick a valid role." });

  const { data: household } = await admin
    .from("households")
    .select("id")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!household)
    redirectWithError("staff", { message: "Create a household first." });

  const monthlySalary = monthlySalaryRaw ? Number(monthlySalaryRaw) : null;
  if (monthlySalaryRaw && Number.isNaN(monthlySalary))
    redirectWithError("staff", { message: "Salary must be a number." });

  let staffProfileId;
  let staffCode;
  let plaintextPin = null;

  if (reuseStaffCode) {
    const { data: existing, error: lookupError } = await admin
      .from("staff_profiles")
      .select("id, staff_code, full_name")
      .eq("staff_code", reuseStaffCode)
      .maybeSingle();

    if (lookupError || !existing)
      redirectWithError("staff", {
        message: "No staff found with that code. Ask them to read it again.",
      });

    staffProfileId = existing.id;
    staffCode = existing.staff_code;
  } else {
    staffCode = generateStaffCode();
    plaintextPin = generateStaffPin();
    const email = staffEmailFromCode(staffCode);

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: plaintextPin,
        email_confirm: true,
        user_metadata: { role: "staff", full_name: fullName },
      });

    if (createError || !created?.user)
      redirectWithError("staff", createError || { message: "Auth provision failed." });

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
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      redirectWithError("staff", profileError || { message: "Profile insert failed." });
    }

    staffProfileId = profile.id;
  }

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

  if (assignError) redirectWithError("staff", assignError);

  revalidatePath("/dashboard");

  if (plaintextPin) {
    const sp = new URLSearchParams({
      staffCode,
      staffPin: plaintextPin,
      staffName: fullName,
      staffPhone: phone || "",
      staffMode: "new",
    });
    redirect(`/dashboard?${sp.toString()}`);
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Reset PIN
// ---------------------------------------------------------------------------
export async function resetStaffPinAction(formData) {
  const { admin } = await getAuthContext();

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  if (!assignmentId) redirectWithError("pin", { message: "Missing assignment id." });

  const { data: assignment } = await admin
    .from("staff_assignments")
    .select("id, household_id, staff_profiles(id, auth_user_id, staff_code, full_name)")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment || !assignment.staff_profiles)
    redirectWithError("pin", { message: "Staff not found." });

  const newPin = generateStaffPin();

  const { error } = await admin.auth.admin.updateUserById(
    assignment.staff_profiles.auth_user_id,
    { password: newPin }
  );

  if (error) redirectWithError("pin", error);

  // Fetch phone for this staff profile
  const { data: profileWithPhone } = await admin
    .from("staff_profiles")
    .select("phone")
    .eq("id", assignment.staff_profiles.id)
    .maybeSingle();

  revalidatePath("/dashboard");
  const sp = new URLSearchParams({
    staffCode: assignment.staff_profiles.staff_code,
    staffPin: newPin,
    staffName: assignment.staff_profiles.full_name,
    staffPhone: profileWithPhone?.phone || "",
    staffMode: "reset",
  });
  redirect(`/dashboard?${sp.toString()}`);
}

// ---------------------------------------------------------------------------
// Deactivate assignment
// ---------------------------------------------------------------------------
export async function deactivateAssignmentAction(formData) {
  const { admin } = await getAuthContext();

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  if (!assignmentId) redirectWithError("remove", { message: "Missing assignment id." });

  const { error } = await admin
    .from("staff_assignments")
    .update({ is_active: false })
    .eq("id", assignmentId);

  if (error) redirectWithError("remove", error);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Save attendance
// ---------------------------------------------------------------------------
export async function saveAttendanceAction(formData) {
  const { user, admin } = await getAuthContext();

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  const attendanceDate = String(formData.get("attendanceDate") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!assignmentId || !attendanceDate || !VALID_STATUSES.has(status)) {
    revalidatePath("/dashboard");
    return;
  }

  await admin.from("attendance_records").upsert(
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
// Decide leave
// ---------------------------------------------------------------------------
export async function decideLeaveAction(formData) {
  const { user, admin } = await getAuthContext();

  const leaveId = String(formData.get("leaveId") || "").trim();
  const decision = String(formData.get("decision") || "").trim();

  if (!leaveId || !VALID_LEAVE_DECISIONS.has(decision))
    redirectWithError("leave", { message: "Invalid leave decision." });

  const { data: leave, error: fetchError } = await admin
    .from("leave_requests")
    .select("id, assignment_id, start_date, end_date, status")
    .eq("id", leaveId)
    .maybeSingle();

  if (fetchError || !leave)
    redirectWithError("leave", fetchError || { message: "Leave not found." });

  if (leave.status !== "pending") {
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  const { error: updateError } = await admin
    .from("leave_requests")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", leaveId);

  if (updateError) redirectWithError("leave", updateError);

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
      await admin
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

// ---------------------------------------------------------------------------
// Change owner password
// ---------------------------------------------------------------------------
export async function changeOwnerPasswordAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in/owner");

  const newPassword = String(formData.get("newPassword") || "").trim();
  const confirmPassword = String(formData.get("confirmPassword") || "").trim();

  if (!newPassword || newPassword.length < 8) {
    redirect("/dashboard?error=pw_weak&detail=Password+must+be+at+least+8+characters");
  }
  if (newPassword !== confirmPassword) {
    redirect("/dashboard?error=pw_mismatch&detail=Passwords+do+not+match");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect(`/dashboard?error=pw_fail&detail=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard?pw=changed");
}

function redirectWithError(stage, error) {
  console.error(`owner action error [${stage}]`, {
    code: error?.code || null,
    message: error?.message || null,
    details: error?.details || null,
    hint: error?.hint || null,
  });
  const detail = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 240) || "Unknown error";
  redirect(`/dashboard?error=${stage}&detail=${encodeURIComponent(detail)}`);
}
