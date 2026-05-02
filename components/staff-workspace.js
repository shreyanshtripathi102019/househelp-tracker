"use client";

import { useMemo, useState } from "react";
import {
  staffMarkAttendanceAction,
  staffApplyLeaveAction,
} from "@/app/staff/dashboard/actions";

const STATUS_META = {
  present: { label: "Present", short: "P", className: "status-present" },
  absent: { label: "Absent", short: "A", className: "status-absent" },
  leave: { label: "Leave", short: "L", className: "status-leave" },
  half_day: { label: "Half day", short: "H", className: "status-half" },
  empty: { label: "Not marked", short: "—", className: "status-empty" },
};

export default function StaffWorkspace({
  profile,
  assignments,
  attendance,
  leaves,
  banner,
}) {
  const [activeAssignmentId, setActiveAssignmentId] = useState(
    assignments[0]?.id || null
  );
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  const activeAssignment = assignments.find((a) => a.id === activeAssignmentId);
  const todayKey = isoDate(new Date());

  const todayRecord = useMemo(
    () => getRecord(attendance, activeAssignmentId, todayKey),
    [attendance, activeAssignmentId, todayKey]
  );

  const monthSummary = useMemo(
    () => buildMonthSummary(attendance, activeAssignmentId, todayKey),
    [attendance, activeAssignmentId, todayKey]
  );

  const recent = useMemo(
    () =>
      attendance
        .filter((r) => r.assignment_id === activeAssignmentId)
        .slice(0, 14),
    [attendance, activeAssignmentId]
  );

  if (!assignments.length) {
    return (
      <section className="card empty-card">
        <p className="eyebrow">Welcome, {profile.full_name}</p>
        <h1 className="auth-heading">No households yet</h1>
        <p className="auth-sub">
          Your employer hasn&apos;t added you to a home. Ask them to add you
          from their dashboard.
        </p>
        <form action="/auth/signout" method="post">
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </section>
    );
  }

  const todayMeta = STATUS_META[todayRecord.status] || STATUS_META.empty;

  return (
    <>
      <section className="card staff-hero">
        <div className="staff-hero-top">
          <div>
            <p className="eyebrow">Hello, {firstWord(profile.full_name)}</p>
            <h1 className="staff-hero-name">{profile.full_name}</h1>
            <p className="muted">Code: {profile.staff_code}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-link" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>

      {banner ? (
        <p
          className={`banner-note ${banner.tone === "err" ? "banner-err" : "banner-ok"}`}
        >
          {banner.text}
        </p>
      ) : null}

      {assignments.length > 1 ? (
        <section className="card household-switcher">
          <p className="section-kicker">Choose a household</p>
          <div className="switcher-grid">
            {assignments.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`switcher-tile ${
                  activeAssignmentId === a.id ? "is-selected" : ""
                }`}
                onClick={() => {
                  setActiveAssignmentId(a.id);
                  setShowLeaveForm(false);
                }}
              >
                <span className="switcher-name">
                  {a.household?.name || "Household"}
                </span>
                <span className="switcher-role">{capitalise(a.role)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card today-card">
        <div className="today-header">
          <p className="section-kicker">Today</p>
          <h2 className="today-date">{formatLongDate(todayKey)}</h2>
          <p className="muted">
            {activeAssignment?.household?.name} ·{" "}
            {capitalise(activeAssignment?.role || "")}
          </p>
        </div>

        <div className={`today-pill ${todayMeta.className}`}>
          {todayMeta.label}
          {todayRecord.note ? (
            <span className="today-note"> — {todayRecord.note}</span>
          ) : null}
        </div>

        <div className="big-actions">
          <form action={staffMarkAttendanceAction}>
            <input type="hidden" name="assignmentId" value={activeAssignmentId} />
            <input type="hidden" name="attendanceDate" value={todayKey} />
            <input type="hidden" name="status" value="present" />
            <button className="big-button big-present" type="submit">
              I&apos;m here today
            </button>
          </form>
          <form action={staffMarkAttendanceAction}>
            <input type="hidden" name="assignmentId" value={activeAssignmentId} />
            <input type="hidden" name="attendanceDate" value={todayKey} />
            <input type="hidden" name="status" value="absent" />
            <button className="big-button big-absent" type="submit">
              I can&apos;t come today
            </button>
          </form>
        </div>

        <button
          type="button"
          className="secondary-button full-width"
          onClick={() => setShowLeaveForm((v) => !v)}
        >
          {showLeaveForm ? "Cancel" : "Apply for leave (one or more days)"}
        </button>

        {showLeaveForm ? (
          <form action={staffApplyLeaveAction} className="leave-form">
            <input type="hidden" name="assignmentId" value={activeAssignmentId} />
            <div className="input-grid">
              <label className="field">
                <span>From</span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={todayKey}
                  required
                />
              </label>
              <label className="field">
                <span>To</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={todayKey}
                  required
                />
              </label>
            </div>
            <label className="field">
              <span>Reason (optional)</span>
              <input
                type="text"
                name="reason"
                placeholder="Festival, family work, sick, etc."
                maxLength={120}
              />
            </label>
            <button className="primary-button full-width" type="submit">
              Submit leave
            </button>
          </form>
        ) : null}
      </section>

      <section className="card month-summary">
        <p className="section-kicker">This month so far</p>
        <div className="summary-strip">
          <SummaryChip value={monthSummary.present} label="Present" cls="status-present" />
          <SummaryChip value={monthSummary.absent} label="Absent" cls="status-absent" />
          <SummaryChip value={monthSummary.leave} label="Leave" cls="status-leave" />
          <SummaryChip value={monthSummary.half} label="Half day" cls="status-half" />
        </div>
      </section>

      <section className="card recent-card">
        <p className="section-kicker">Last 14 entries</p>
        {recent.length === 0 ? (
          <p className="muted">No attendance saved yet for this home.</p>
        ) : (
          <div className="recent-list">
            {recent.map((entry) => {
              const meta = STATUS_META[entry.status] || STATUS_META.empty;
              return (
                <div key={entry.id} className="recent-item">
                  <div>
                    <strong>{formatMediumDate(entry.attendance_date)}</strong>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </div>
                  <span className={`status-pill ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {leaves.length ? (
        <section className="card recent-card">
          <p className="section-kicker">Leaves you applied</p>
          <div className="recent-list">
            {leaves
              .filter((l) => l.assignment_id === activeAssignmentId)
              .slice(0, 8)
              .map((l) => (
                <div key={l.id} className="recent-item">
                  <div>
                    <strong>
                      {formatMediumDate(l.start_date)}
                      {l.start_date === l.end_date
                        ? ""
                        : ` → ${formatMediumDate(l.end_date)}`}
                    </strong>
                    {l.reason ? <p>{l.reason}</p> : null}
                  </div>
                  <span className="status-pill status-leave">Leave</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function SummaryChip({ value, label, cls }) {
  return (
    <div className="summary-chip">
      <strong className={cls}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function getRecord(records, assignmentId, dateKey) {
  const entry = records.find(
    (r) => r.assignment_id === assignmentId && r.attendance_date === dateKey
  );
  return { status: entry?.status || "empty", note: entry?.note || "" };
}

function buildMonthSummary(records, assignmentId, today) {
  const month = today.slice(0, 7);
  let present = 0,
    absent = 0,
    leave = 0,
    half = 0;
  for (const r of records) {
    if (r.assignment_id !== assignmentId) continue;
    if (!r.attendance_date.startsWith(month)) continue;
    if (r.status === "present") present += 1;
    else if (r.status === "absent") absent += 1;
    else if (r.status === "leave") leave += 1;
    else if (r.status === "half_day") half += 1;
  }
  return { present, absent, leave, half };
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatLongDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function formatMediumDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function firstWord(value) {
  if (!value) return "";
  return value.split(/\s+/)[0];
}

function capitalise(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
