"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["present", "absent", "leave", "half_day"]);

// ---------------------------------------------------------------------------
// Staff marks their own attendance for one (assignment, date)
// ---------------------------------------------------------------------------
export async function staffMarkAttendanceAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/staff");
  }

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  const attendanceDate = String(formData.get("attendanceDate") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!assignmentId || !attendanceDate || !VALID_STATUSES.has(status)) {
    revalidatePath("/staff/dashboard");
    return;
  }

  // RLS verifies the assignment belongs to this signed-in staff.
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

  revalidatePath("/staff/dashboard");
}

// ---------------------------------------------------------------------------
// Staff applies leave. Per the "trust staff fully" model, we auto-approve
// the leave AND write attendance_records=leave for each day in the range,
// so the owner sees those days as leave immediately on their calendar.
// ---------------------------------------------------------------------------
export async function staffApplyLeaveAction(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/staff");
  }

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!assignmentId || !startDate || !endDate) {
    redirect("/staff/dashboard?error=leave_fields");
  }

  if (endDate < startDate) {
    redirect("/staff/dashboard?error=leave_range");
  }

  const { error: leaveError } = await supabase.from("leave_requests").insert({
    assignment_id: assignmentId,
    start_date: startDate,
    end_date: endDate,
    reason: reason || null,
    // Even though the DB default is 'pending', the staff RLS only allows
    // inserts where status='pending'. We then upsert attendance below to
    // mark the days as leave immediately so the owner sees them.
    status: "pending",
  });

  if (leaveError) {
    console.error("staffApplyLeaveAction:insert", leaveError);
    redirect("/staff/dashboard?error=leave_save");
  }

  // Auto-write attendance_records for every day in the range as 'leave'.
  // This is the "trust staff fully" behaviour — no owner approval needed.
  const days = enumerateDates(startDate, endDate);
  if (days.length) {
    const rows = days.map((d) => ({
      assignment_id: assignmentId,
      attendance_date: d,
      status: "leave",
      note: reason ? `Leave: ${reason}` : "Leave",
      marked_by: user.id,
    }));
    const { error: attError } = await supabase
      .from("attendance_records")
      .upsert(rows, { onConflict: "assignment_id,attendance_date" });

    if (attError) {
      console.error("staffApplyLeaveAction:attendance", attError);
    }
  }

  revalidatePath("/staff/dashboard");
  redirect("/staff/dashboard?leave_applied=1");
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
