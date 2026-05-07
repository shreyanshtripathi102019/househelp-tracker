"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addStaffAction,
  resetStaffPinAction,
  deactivateAssignmentAction,
  saveAttendanceAction,
  changeOwnerPasswordAction,
} from "@/app/dashboard/actions";

const STATUS_META = {
  present: { label: "Present", short: "P", className: "status-present" },
  absent:  { label: "Absent",  short: "A", className: "status-absent"  },
  leave:   { label: "Leave",   short: "L", className: "status-leave"   },
  half_day:{ label: "Half day",short: "H", className: "status-half"    },
  empty:   { label: "—",       short: "—", className: "status-empty"   },
};

const ROLE_OPTIONS = [
  { value: "cook",    label: "Cook"    },
  { value: "cleaner", label: "Cleaner" },
  { value: "nanny",   label: "Nanny"   },
  { value: "driver",  label: "Driver"  },
  { value: "other",   label: "Other"   },
];

export default function OwnerWorkspace({
  household,
  assignments,
  attendance,
  leaves,
  ownerName,
  freshCredentials,
  passwordBanner,
}) {
  const activeAssignments = assignments.filter((a) => a.is_active && a.staff);
  const [selectedId, setSelectedId] = useState(activeAssignments[0]?.id || null);
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);
  const [mainTab, setMainTab] = useState("calendar"); // 'calendar' | 'activity'

  const selected = activeAssignments.find((a) => a.id === selectedId);
  const todayKey = dateKey(new Date());

  const summaries = useMemo(
    () => buildSummaries(activeAssignments, attendance, currentMonth),
    [activeAssignments, attendance, currentMonth]
  );

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const selectedRecord = selected
    ? getRecord(attendance, selected.id, selectedDate)
    : { status: "empty", note: "" };

  const [draftStatus, setDraftStatus] = useState(
    selectedRecord.status === "empty" ? "present" : selectedRecord.status
  );
  const [draftNote, setDraftNote] = useState(selectedRecord.note || "");

  useEffect(() => {
    setDraftStatus(selectedRecord.status === "empty" ? "present" : selectedRecord.status);
    setDraftNote(selectedRecord.note || "");
  }, [selectedId, selectedDate, selectedRecord.status, selectedRecord.note]);

  // When switching staff, reset month to current
  function selectStaff(id) {
    setSelectedId(id);
    setCurrentMonth(monthKey(new Date()));
    setSelectedDate(dateKey(new Date()));
    setMainTab("calendar");
  }

  return (
    <div className="ow-root">

      {/* ── Hero ── */}
      <section className="card ow-hero">
        <div className="ow-hero-left">
          <p className="eyebrow">Owner Dashboard</p>
          <h1 className="ow-household">{household.name}</h1>
          <p className="ow-owner">{capitalise(ownerName)}</p>
        </div>
        <div className="ow-hero-right">
          <p className="ow-today-text">{formatFullDate(todayKey)}</p>
          <div className="ow-hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? "Close" : "Add staff"}
            </button>
            <form action="/auth/signout" method="post">
              <button className="secondary-button" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Password banner ── */}
      {passwordBanner && (
        <p className={`banner-note${passwordBanner.tone === "ok" ? " success" : ""}`}>
          {passwordBanner.text}
        </p>
      )}

      {/* ── Credentials card after adding staff ── */}
      {freshCredentials && <FreshCredentialsCard credentials={freshCredentials} />}

      {/* ── Add staff form ── */}
      {showAddForm && <AddStaffForm onClose={() => setShowAddForm(false)} />}

      {/* ── Staff tab bar ── */}
      {activeAssignments.length > 0 && (
        <div className="ow-staff-tabs">
          {activeAssignments.map((a) => {
            const todayStatus = getRecord(attendance, a.id, todayKey).status;
            const meta = STATUS_META[todayStatus];
            return (
              <button
                key={a.id}
                type="button"
                className={`ow-staff-tab ${selectedId === a.id ? "is-active" : ""}`}
                onClick={() => selectStaff(a.id)}
              >
                <span className={`ow-tab-dot ${meta.className}`} />
                <span className="ow-tab-name">{a.staff?.full_name}</span>
                <span className="ow-tab-role">{capitalise(a.role)}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeAssignments.length === 0 && (
        <div className="card ow-empty">
          <p>No staff yet. Click <strong>Add staff</strong> above to get started.</p>
        </div>
      )}

      {/* ── Change Password (owner settings) ── */}
      <ChangePasswordSection />

      {/* ── Main view ── */}
      {selected && (
        <div className="card ow-main-card">
          {/* View tabs */}
          <div className="ow-view-tabs">
            <button
              type="button"
              className={`ow-view-tab ${mainTab === "calendar" ? "is-active" : ""}`}
              onClick={() => setMainTab("calendar")}
            >
              Calendar
            </button>
            <button
              type="button"
              className={`ow-view-tab ${mainTab === "activity" ? "is-active" : ""}`}
              onClick={() => setMainTab("activity")}
            >
              Activity
            </button>

            {/* Quick mark buttons */}
            <div className="ow-quick-marks">
              <form action={saveAttendanceAction}>
                <input type="hidden" name="assignmentId" value={selected.id} />
                <input type="hidden" name="attendanceDate" value={todayKey} />
                <input type="hidden" name="status" value="present" />
                <button className="ow-mark-btn present" type="submit">✓ Present today</button>
              </form>
              <form action={saveAttendanceAction}>
                <input type="hidden" name="assignmentId" value={selected.id} />
                <input type="hidden" name="attendanceDate" value={todayKey} />
                <input type="hidden" name="status" value="absent" />
                <button className="ow-mark-btn absent" type="submit">✗ Absent today</button>
              </form>
            </div>
          </div>

          {/* Calendar view */}
          {mainTab === "calendar" && (
            <div className="ow-calendar-content">
              {/* Month navigation + summary */}
              <div className="ow-cal-header">
                <div className="month-controls">
                  <button className="icon-button" type="button" onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}>Previous</button>
                  <p className="month-label">{formatMonthLabel(currentMonth)}</p>
                  <button className="icon-button" type="button" onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}>Next</button>
                </div>
                <div className="summary-strip ow-summary">
                  {[
                    { key: "present", label: "Present", cls: "status-present" },
                    { key: "absent",  label: "Absent",  cls: "status-absent"  },
                    { key: "leave",   label: "Leave",   cls: "status-leave"   },
                    { key: "unmarked",label: "Open",    cls: "status-empty"   },
                  ].map(({ key, label, cls }) => (
                    <div className="summary-chip" key={key}>
                      <strong className={cls}>{summaries[selected.id]?.[key] ?? 0}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar grid */}
              <div className="calendar-wrap">
                <div className="weekday-row" aria-hidden="true">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <span key={d}>{d}</span>)}
                </div>
                <div className="calendar-grid">
                  {calendarDays.map((day) => {
                    const record = getRecord(attendance, selected.id, day.dateKey);
                    const meta = STATUS_META[record.status];
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        className={[
                          "day-cell",
                          day.isCurrentMonth ? "" : "is-outside",
                          selectedDate === day.dateKey ? "is-selected" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => {
                          setSelectedDate(day.dateKey);
                          setCurrentMonth(monthKey(dateKeyToDate(day.dateKey)));
                        }}
                      >
                        <div className="day-top">
                          <span className="day-number">{day.dayOfMonth}</span>
                          {record.note && <span className="note-mark" aria-hidden="true" />}
                        </div>
                        <span className={`status-pill ${meta.className}`}>{meta.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day editor */}
              <div className="editor-panel">
                <div className="section-heading compact">
                  <p className="section-kicker">Day details</p>
                  <h3>{formatFullDate(selectedDate)}</h3>
                </div>
                <form action={saveAttendanceAction} className="editor-form">
                  <input type="hidden" name="assignmentId" value={selected.id} />
                  <input type="hidden" name="attendanceDate" value={selectedDate} />
                  <input type="hidden" name="status" value={draftStatus} />
                  <div className="status-button-row four">
                    {["present","absent","leave","half_day"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`status-button ${draftStatus === s ? "is-active" : ""}`}
                        onClick={() => setDraftStatus(s)}
                      >
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    <span>Note (optional)</span>
                    <textarea
                      name="note"
                      rows="2"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Festival, sick, half day…"
                    />
                  </label>
                  <button className="primary-button" type="submit">Save</button>
                </form>
              </div>
            </div>
          )}

          {/* Activity view */}
          {mainTab === "activity" && (
            <div className="ow-activity-content">
              <div className="recent-list">
                {[...attendance]
                  .filter((r) => r.assignment_id === selected.id)
                  .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
                  .slice(0, 20)
                  .map((entry) => {
                    const meta = STATUS_META[entry.status] || STATUS_META.empty;
                    return (
                      <div key={entry.id} className="recent-item">
                        <div>
                          <strong>{formatMediumDate(entry.attendance_date)}</strong>
                          <p>{entry.note || "—"}</p>
                        </div>
                        <span className={`status-pill ${meta.className}`}>{meta.label}</span>
                      </div>
                    );
                  })}
                {attendance.filter((r) => r.assignment_id === selected.id).length === 0 && (
                  <p className="ow-empty-msg">No attendance recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Staff management footer */}
          <details className="ow-staff-options">
            <summary>Manage {selected.staff?.full_name}</summary>
            <div className="ow-staff-options-row">
              <form action={resetStaffPinAction}>
                <input type="hidden" name="assignmentId" value={selected.id} />
                <button className="text-link" type="submit">Reset PIN</button>
              </form>
              <form
                action={deactivateAssignmentAction}
                onSubmit={(e) => {
                  if (!confirm(`Remove ${selected.staff?.full_name} from this household?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="assignmentId" value={selected.id} />
                <button className="text-link danger" type="submit">Remove from household</button>
              </form>
              {selected.monthly_salary && (
                <span className="ow-salary">Monthly salary: ₹{Number(selected.monthly_salary).toLocaleString("en-IN")}</span>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FreshCredentialsCard({ credentials }) {
  const heading = credentials.staffMode === "reset" ? "New PIN issued" : "Staff added";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const loginUrl = `${origin}/sign-in/staff`;

  // Build WhatsApp message — prefer phone-based instructions if phone is available
  let message;
  if (credentials.staffPhone) {
    message =
      `Hi ${credentials.staffName || ""}! 🏠\n` +
      `Your attendance app login:\n` +
      `📱 Phone: ${credentials.staffPhone}\n` +
      `🔑 PIN: ${credentials.staffPin}\n` +
      `🔗 Link: ${loginUrl}\n\n` +
      `Enter your phone number and PIN to sign in. Save this message!`;
  } else {
    message =
      `Hi ${credentials.staffName || ""}! 🏠\n` +
      `Your attendance app login:\n` +
      `🔑 Code: ${credentials.staffCode}\n` +
      `🔑 PIN: ${credentials.staffPin}\n` +
      `🔗 Link: ${loginUrl}\n\n` +
      `(Ask your employer to add your phone number so you can log in with it next time.)`;
  }

  return (
    <section className="card ow-creds-card">
      <div className="section-heading">
        <p className="section-kicker">One-time</p>
        <h2>{heading}</h2>
      </div>
      <div className="credentials-grid">
        {credentials.staffPhone ? (
          <div className="credential-chip">
            <span>Phone</span>
            <strong>{credentials.staffPhone}</strong>
          </div>
        ) : (
          <div className="credential-chip">
            <span>Code</span>
            <strong>{credentials.staffCode}</strong>
          </div>
        )}
        <div className="credential-chip">
          <span>PIN</span>
          <strong>{credentials.staffPin}</strong>
        </div>
      </div>
      <button
        type="button"
        className="secondary-button"
        onClick={() => navigator?.clipboard?.writeText(message)}
      >
        Copy WhatsApp message
      </button>
      <p className="banner-note subtle">PIN is shown once. Use &ldquo;Reset PIN&rdquo; if they lose it.</p>
    </section>
  );
}

function AddStaffForm({ onClose }) {
  const [mode, setMode] = useState("new");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(formData) {
    if (submitted) return;
    setSubmitted(true);
    startTransition(() => addStaffAction(formData));
  }

  const busy = isPending || submitted;

  return (
    <section className="card ow-add-card">
      <div className="section-heading row">
        <div>
          <p className="section-kicker">Add staff</p>
          <h2>{mode === "new" ? "New person" : "Existing staff"}</h2>
        </div>
        <button type="button" className="text-link" onClick={onClose} disabled={busy}>Close</button>
      </div>

      <div className="mode-toggle">
        <button type="button" className={`mode-button ${mode === "new" ? "is-active" : ""}`} onClick={() => setMode("new")} disabled={busy}>New person</button>
        <button type="button" className={`mode-button ${mode === "reuse" ? "is-active" : ""}`} onClick={() => setMode("reuse")} disabled={busy}>Use existing code</button>
      </div>

      <form action={handleSubmit} className="setup-form">
        {mode === "new" ? (
          <>
            <label className="field">
              <span>Full name</span>
              <input name="fullName" type="text" placeholder="Sita Devi" required disabled={busy} />
            </label>
            <label className="field">
              <span>Phone (optional)</span>
              <input name="phone" type="tel" placeholder="+91 9xxxxxxxxx" disabled={busy} />
            </label>
          </>
        ) : (
          <label className="field">
            <span>Staff code</span>
            <input name="reuseStaffCode" type="text" placeholder="ABCDEF" required autoComplete="off" style={{ textTransform: "uppercase" }} disabled={busy} />
          </label>
        )}

        <div className="input-grid">
          <label className="field">
            <span>Role</span>
            <select name="role" defaultValue="cook" required disabled={busy}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Monthly salary ₹ (optional)</span>
            <input name="monthlySalary" type="number" min="0" placeholder="6000" disabled={busy} />
          </label>
        </div>

        <label className="field">
          <span>Start date (optional)</span>
          <input name="startDate" type="date" disabled={busy} />
        </label>

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Adding…" : mode === "new" ? "Add and generate PIN" : "Add to household"}
        </button>
      </form>
    </section>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(formData) {
    if (submitted) return;
    setSubmitted(true);
    startTransition(() => changeOwnerPasswordAction(formData));
  }

  const busy = isPending || submitted;

  return (
    <details className="card ow-settings-card" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="ow-settings-summary">Account &amp; Password</summary>
      {open && (
        <form action={handleSubmit} className="setup-form" style={{ marginTop: "1rem" }}>
          <label className="field">
            <span>New password</span>
            <input
              name="newPassword"
              type="password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              disabled={busy}
              autoComplete="new-password"
            />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              minLength={8}
              required
              disabled={busy}
              autoComplete="new-password"
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </details>
  );
}

// ── Date + summary helpers ────────────────────────────────────────────────────

function buildSummaries(assignments, records, month) {
  const days = getDaysInMonth(month);
  const out = {};
  for (const a of assignments) {
    let present = 0, absent = 0, leave = 0, half = 0;
    for (let d = 1; d <= days; d++) {
      const k = `${month}-${String(d).padStart(2, "0")}`;
      const s = getRecord(records, a.id, k).status;
      if (s === "present") present++;
      else if (s === "absent") absent++;
      else if (s === "leave") leave++;
      else if (s === "half_day") half++;
    }
    const marked = present + absent + leave + half;
    out[a.id] = { present, absent, leave, half, unmarked: days - marked, attendanceRate: Math.round((marked / days) * 100) };
  }
  return out;
}

function getRecord(records, assignmentId, recordDateKey) {
  const entry = records.find((r) => r.assignment_id === assignmentId && r.attendance_date === recordDateKey);
  return { status: entry?.status || "empty", note: entry?.note || "" };
}

function buildCalendarDays(month) {
  const base = monthKeyToDate(month);
  const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { dateKey: dateKey(date), dayOfMonth: date.getDate(), isCurrentMonth: date.getMonth() === base.getMonth() };
  });
}

function getDaysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyToDate(value) {
  const [y, m] = value.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function shiftMonth(value, delta) {
  const d = monthKeyToDate(value);
  d.setMonth(d.getMonth() + delta);
  return monthKey(d);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeyToDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(monthKeyToDate(value));
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dateKeyToDate(value));
}

function formatMediumDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(dateKeyToDate(value));
}

function capitalise(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
