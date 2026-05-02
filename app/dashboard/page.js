import { redirect } from "next/navigation";
import OwnerWorkspace from "@/components/owner-workspace";
import { createHouseholdAction } from "@/app/dashboard/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const SETUP_ERROR_MESSAGES = {
  household: "We could not create the household. Try again.",
  staff: "We could not save the staff member. Try again.",
  pin: "We could not reset the PIN. Try again.",
  remove: "We could not remove the staff member.",
  leave: "We could not update the leave request.",
};

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in/owner");
  }

  // If the signed-in user is actually a staff (synthetic email), bounce them
  // to their own dashboard.
  if (user.email && user.email.endsWith("@staff.arit.local")) {
    redirect("/staff/dashboard");
  }

  // Find this owner's household. For now we assume one household per owner.
  const { data: household } = await supabase
    .from("households")
    .select("id, name, slug, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!household) {
    const setupError = params.error
      ? SETUP_ERROR_MESSAGES[params.error] ||
        "Something went wrong. Try again."
      : null;
    const detailNote = params.detail ? decodeURIComponent(params.detail) : null;

    return (
      <main className="page-shell compact-shell">
        <section className="card setup-card">
          <div className="section-heading">
            <p className="eyebrow">First-time setup</p>
            <h1>Create your household</h1>
            <p className="hero-text">
              Give your home a name. You&apos;ll add staff in the next step.
            </p>
          </div>

          {setupError ? <p className="banner-note">{setupError}</p> : null}
          {detailNote ? <p className="banner-note subtle">{detailNote}</p> : null}

          <form action={createHouseholdAction} className="setup-form">
            <label className="field">
              <span>Household name</span>
              <input
                name="householdName"
                type="text"
                placeholder="Tripathi Home"
                required
              />
            </label>

            <button className="primary-button" type="submit">
              Create household
            </button>
          </form>
        </section>
      </main>
    );
  }

  const { data: assignmentsRaw = [] } = await supabase
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
      supabase
        .from("attendance_records")
        .select("id, assignment_id, attendance_date, status, note, updated_at")
        .in("assignment_id", activeAssignmentIds)
        .gte("attendance_date", rangeStart.toISOString().slice(0, 10))
        .lte("attendance_date", rangeEnd.toISOString().slice(0, 10)),
      supabase
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

  // Read once-shown PIN/code from URL query params, then it disappears on the
  // next interaction. We never persist plaintext PINs in the DB.
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
  );
}
