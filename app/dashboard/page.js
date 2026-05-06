import { redirect } from "next/navigation";
import OwnerWorkspace from "@/components/owner-workspace";
import CreateHouseholdForm from "@/components/create-household-form";
import SiteNav from "@/components/site-nav";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardPage({ searchParams }) {
  const params = (await searchParams) || {};

  if (!hasSupabaseEnv()) {
    return (
      <main className="page-shell compact-shell">
        <section className="card auth-card">
          <div className="section-heading">
            <p className="eyebrow">Configuration</p>
            <h1>Supabase keys are missing</h1>
            <p className="hero-text">
              Add the values from <code>.env.example</code> to your environment
              and run the SQL migration before opening the dashboard.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // Verify identity with the user-scoped client (validates the JWT).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  if (user.email && user.email.endsWith("@staff.arit.local")) {
    redirect("/staff/dashboard");
  }

  // Use admin client for all DB reads so RLS never silently blocks data.
  // Security is enforced by filtering on user.id from the verified JWT above.
  const admin = createAdminClient();

  const { data: household } = await admin
    .from("households")
    .select("id, name, slug, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!household) {
    return (
      <>
        <SiteNav />
        <main className="page-shell compact-shell">
          <section className="card setup-card">
            <div className="section-heading">
              <p className="eyebrow">First-time setup</p>
              <h1>Create your household</h1>
              <p className="hero-text">
                Give your home a name. You&apos;ll add staff in the next step.
              </p>
            </div>
            <CreateHouseholdForm />
          </section>
        </main>
      </>
    );
  }

  const { data: assignmentsRaw = [] } = await admin
    .from("staff_assignments")
    .select(
      "id, role, monthly_salary, start_date, is_active, staff_profile_id, staff_profiles(id, full_name, staff_code, phone)"
    )
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  const assignments = (assignmentsRaw || []).map((row) => ({
    id: row.id,
    role: row.role,
    monthly_salary: row.monthly_salary,
    start_date: row.start_date,
    is_active: row.is_active,
    staff: row.staff_profiles
      ? {
          id: row.staff_profiles.id,
          full_name: row.staff_profiles.full_name,
          staff_code: row.staff_profiles.staff_code,
          phone: row.staff_profiles.phone,
        }
      : null,
  }));

  const activeAssignmentIds = assignments
    .filter((a) => a.is_active && a.staff)
    .map((a) => a.id);

  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - 12);
  const rangeEnd = new Date();
  rangeEnd.setMonth(rangeEnd.getMonth() + 2);

  let attendanceRows = [];
  let leaveRows = [];

  if (activeAssignmentIds.length) {
    const [{ data: aData = [] }, { data: lData = [] }] = await Promise.all([
      admin
        .from("attendance_records")
        .select("id, assignment_id, attendance_date, status, note, updated_at")
        .in("assignment_id", activeAssignmentIds)
        .gte("attendance_date", rangeStart.toISOString().slice(0, 10))
        .lte("attendance_date", rangeEnd.toISOString().slice(0, 10)),
      admin
        .from("leave_requests")
        .select(
          "id, assignment_id, start_date, end_date, reason, status, created_at, decided_at"
        )
        .in("assignment_id", activeAssignmentIds)
        .order("created_at", { ascending: false }),
    ]);

    attendanceRows = aData || [];
    leaveRows = lData || [];
  }

  const fresh =
    params.staffCode && params.staffPin
      ? {
          staffCode: String(params.staffCode),
          staffPin: String(params.staffPin),
          staffName: params.staffName ? String(params.staffName) : "",
          staffMode: params.staffMode === "reset" ? "reset" : "new",
        }
      : null;

  return (
    <>
      <SiteNav />
      <main className="page-shell">
        <OwnerWorkspace
          household={household}
          assignments={assignments}
          attendance={attendanceRows}
          leaves={leaveRows}
          userEmail={user.email || ""}
          freshCredentials={fresh}
        />
      </main>
    </>
  );
}
