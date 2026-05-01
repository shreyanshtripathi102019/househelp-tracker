import { redirect } from "next/navigation";
import AttendanceWorkspace from "@/components/attendance-workspace";
import { createHouseholdAction } from "@/app/dashboard/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function getSetupErrorMessage(errorCode, errorDetail) {
  const detailSuffix = errorDetail ? ` Details: ${errorDetail}` : "";

  if (errorCode === "household") {
    return `The household could not be created. Please try again.${detailSuffix}`;
  }

  if (errorCode === "membership") {
    return `The owner membership could not be created. Please refresh and try again.${detailSuffix}`;
  }

  if (errorCode === "workers") {
    return `The worker records could not be created. Please try again now that the setup flow is fixed.${detailSuffix}`;
  }

  return null;
}

export default async function DashboardPage({ searchParams }) {
  const params = (await searchParams) || {};

  if (!hasSupabaseEnv()) {
    return (
      <main className="page-shell compact-shell">
        <section className="card auth-card">
          <div className="section-heading">
            <p className="eyebrow">Configuration</p>
            <h1>Supabase keys are still missing</h1>
            <p className="hero-text">
              Add the values from `.env.example` to `.env.local`, then create the
              database tables from the SQL migration before trying the dashboard.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const userEmail = claimsData?.claims?.email || "";

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role, worker_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    const setupError = getSetupErrorMessage(params.error, params.detail);

    return (
      <main className="page-shell compact-shell">
        <section className="card setup-card">
          <div className="section-heading">
            <p className="eyebrow">First-time setup</p>
            <h1>Create your first household</h1>
            <p className="hero-text">
              This creates the initial home account and adds two default workers:
              one cook and one cleaner.
            </p>
          </div>

          {setupError ? <p className="banner-note">{setupError}</p> : null}

          <form action={createHouseholdAction} className="setup-form">
            <label className="field">
              <span>Household name</span>
              <input name="householdName" type="text" placeholder="Arit Home" required />
            </label>

            <div className="input-grid">
              <label className="field">
                <span>Cook name</span>
                <input name="cookName" type="text" placeholder="Rekha" />
              </label>

              <label className="field">
                <span>Cleaner name</span>
                <input name="cleanerName" type="text" placeholder="Sita" />
              </label>
            </div>

            <button className="primary-button" type="submit">
              Create household
            </button>
          </form>
        </section>
      </main>
    );
  }

  const { data: household } = await supabase
    .from("households")
    .select("id, name, slug, created_at")
    .eq("id", membership.household_id)
    .single();

  if (!household) {
    redirect("/sign-in");
  }

  let workersQuery = supabase
    .from("workers")
    .select("id, household_id, display_name, category, is_active, linked_user_id, created_at")
    .eq("household_id", membership.household_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (membership.role === "worker" && membership.worker_id) {
    workersQuery = workersQuery.eq("id", membership.worker_id);
  }

  const { data: workers = [] } = await workersQuery;

  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - 12);
  const rangeEnd = new Date();
  rangeEnd.setMonth(rangeEnd.getMonth() + 2);

  let attendanceQuery = supabase
    .from("attendance_records")
    .select("id, worker_id, attendance_date, status, note, marked_by, created_at, updated_at")
    .eq("household_id", membership.household_id)
    .gte("attendance_date", rangeStart.toISOString().slice(0, 10))
    .lte("attendance_date", rangeEnd.toISOString().slice(0, 10));

  if (membership.role === "worker" && membership.worker_id) {
    attendanceQuery = attendanceQuery.eq("worker_id", membership.worker_id);
  }

  const { data: records = [] } = await attendanceQuery;

  return (
    <main className="page-shell">
      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>

      <AttendanceWorkspace
        household={household}
        workers={workers}
        records={records}
        viewerRole={membership.role}
        userEmail={userEmail}
      />
    </main>
  );
}
