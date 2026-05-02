import { redirect } from "next/navigation";
import StaffWorkspace from "@/components/staff-workspace";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function StaffDashboardPage({ searchParams }) {
  const params = (await searchParams) || {};

  if (!hasSupabaseEnv()) {
    return (
      <main className="page-shell narrow-shell">
        <section className="card auth-card">
          <p className="eyebrow">Configuration</p>
          <h1 className="auth-heading">Portal not configured</h1>
          <p className="auth-sub">
            Ask your employer to finish setup and try again.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/staff");
  }

  // If an owner accidentally lands here, bounce to /dashboard
  if (user.email && !user.email.endsWith("@staff.arit.local")) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, full_name, staff_code, phone")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <main className="page-shell narrow-shell">
        <section className="card auth-card">
          <p className="eyebrow">Account not ready</p>
          <h1 className="auth-heading">Your profile isn&apos;t set up</h1>
          <p className="auth-sub">
            Ask your employer to add you again from their dashboard.
          </p>
          <form action="/auth/signout" method="post">
            <button className="primary-button full-width" type="submit">
              Sign out
            </button>
          </form>
        </section>
      </main>
    );
  }

  const { data: assignmentsRaw = [] } = await supabase
    .from("staff_assignments")
    .select(
      "id, role, monthly_salary, start_date, is_active, household_id, households(id, name)"
    )
    .eq("staff_profile_id", profile.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const assignments = (assignmentsRaw || []).map((row) => ({
    id: row.id,
    role: row.role,
    monthly_salary: row.monthly_salary,
    start_date: row.start_date,
    household: row.households
      ? { id: row.households.id, name: row.households.name }
      : null,
  }));

  const assignmentIds = assignments.map((a) => a.id);

  let attendance = [];
  let leaves = [];

  if (assignmentIds.length) {
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 6);

    const [{ data: aRows = [] }, { data: lRows = [] }] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("id, assignment_id, attendance_date, status, note, updated_at")
        .in("assignment_id", assignmentIds)
        .gte("attendance_date", rangeStart.toISOString().slice(0, 10))
        .order("attendance_date", { ascending: false }),
      supabase
        .from("leave_requests")
        .select(
          "id, assignment_id, start_date, end_date, reason, status, created_at"
        )
        .in("assignment_id", assignmentIds)
        .order("created_at", { ascending: false }),
    ]);

    attendance = aRows || [];
    leaves = lRows || [];
  }

  const banner = bannerFor(params);

  return (
    <main className="page-shell">
      <StaffWorkspace
        profile={profile}
        assignments={assignments}
        attendance={attendance}
        leaves={leaves}
        banner={banner}
      />
    </main>
  );
}

function bannerFor(params) {
  if (params?.leave_applied === "1") {
    return { tone: "ok", text: "Leave applied. Your owner can see it now." };
  }
  if (params?.error === "leave_fields") {
    return { tone: "err", text: "Pick the household and both dates." };
  }
  if (params?.error === "leave_range") {
    return { tone: "err", text: "End date must be the same day or after start date." };
  }
  if (params?.error === "leave_save") {
    return { tone: "err", text: "Could not save your leave. Try again." };
  }
  return null;
}
