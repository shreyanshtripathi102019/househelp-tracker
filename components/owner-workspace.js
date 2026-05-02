"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addStaffAction,
  resetStaffPinAction,
  deactivateAssignmentAction,
  saveAttendanceAction,
} from "@/app/dashboard/actions";

const STATUS_META = {
  present: { label: "Present", short: "P", className: "status-present" },
  absent: { label: "Absent", short: "A", className: "status-absent" },
  leave: { label: "Leave", short: "L", className: "status-leave" },
  half_day: { label: "Half day", short: "H", className: "status-half" },
  empty: { label: "Not marked", short: "—", className: "status-empty" },
};

const ROLE_OPTIONS = [
  { value: "cook", label: "Cook" },
  { value: "cleaner", label: "Cleaner" },
  { value: "nanny", label: "Nanny" },
  { value: "driver", label: "Driver" },
  { value: "other", label: "Other" },
];

export default function OwnerWorkspace({
  household,
  assignments,
  attendance,
  leaves,
  userEmail,
  freshCredentials,
}) {
  const activeAssignments = assignments.filter((a) => a.is_active && a.staff);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(
    activeAssignments[0]?.id || null
  );
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);

  const selected = activeAssignments.find((a) => a.id === selectedAssignmentId);
  const todayKey = dateKey(new Date());
  // We trust staff fully — leaves are applied directly. We surface a
  // simple "recent leaves" feed instead of an approval inbox.
  const recentLeaves = [...leaves]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 6);

  const summaries = useMemo(
    () => buildSummaries(activeAssignments, attendance, currentMonth),
    [activeAssignments, attendance, currentMonth]
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth),
    [currentMonth]
  );

  const selectedRecord = selected
    ? getRecord(attendance, selected.id, selectedDate)
    : { status: "empty", note: "" };

  const [draftStatus, setDraftStatus] = useState(
    selectedRecord.status === "empty" ? "present" : selectedRecord.status
  );
  const [draftNote, setDraftNote] = useState(selectedRecord.note || "");

  useEffect(() => {
    setDraftStatus(
      selectedRecord.status === "empty" ? "present" : selectedRecord.status
    );
    setDraftNote(selectedRecord.note || "");
  }, [selectedAssignmentId, selectedDate, selectedRecord.note, selectedRecord.status]);

  return (
    <>
      <section className="hero card dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">Owner dashboard</p>
          <h1>{household.name}</h1>
          <p className="hero-text">
            Signed in as {userEmail || "owner"}. Mark attendance for the day,
            review leave requests, and add new staff with a one-time PIN.
          </p>
        </div>

        <div className="hero-panel">
          <div className="hero-note">
            <p>
              {activeAssignments.length === 0
                ? "Add your first staff member to start marking attendance."
                : `Today is ${formatFullDate(todayKey)}.`}
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? "Close" : "Add staff"}
            </button>
            <form action="/auth/signout" method="post">
              <button className="secondary-button" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </section>

      {freshCredentials ? (
        <FreshCredentialsCard credentials={freshCredentials} />
      ) : null}

      {showAddForm ? <AddStaffForm onClose={() => setShowAddForm(false)} /> : null}

      {recentLeaves.length > 0 ? (
        <LeaveFeed leaves={recentLeaves} assignments={activeAssignments} />
      ) : null}

      <main className="layout">
        <section className="card roster-panel">
          <div className="section-heading">
            <p className="section-kicker">Roster</p>
            <h2>Your staff</h2>
          </div>

          {activeAssignments.length === 0 ? (
            <div className="empty-card-inline">
              <p>No staff yet. Tap “Add staff” above to add your first.</p>
            </div>
          ) : (
            <div className="worker-grid">
              {activeAssignments.map((assignment) => {
                const summary = summaries[assignment.id] || zeroSummary();
                const todayRecord = getRecord(attendance, assignment.id, todayKey);
                const meta = STATUS_META[todayRecord.status];

                return (
                  <article
                    key={assignment.id}
                    className={`worker-card ${
                      selectedAssignmentId === assignment.id ? "is-selected" : ""
                    }`}
                  >
                    <div className="worker-heading">
                      <div>
                        <p className="worker-role">
                          {capitalise(assignment.role)}
                          {assignment.staff?.staff_code
                            ? ` · ${assignment.staff.staff_code}`
                            : ""}
                        </p>
                        <h3 className="worker-name">
                          {assignment.staff?.full_name || "Staff"}
                        </h3>
                      </div>
                      <span className="worker-tag">
                        {summary.attendanceRate}% marked
                      </span>
                    </div>

                    <div className="stats-row">
                      <div className="stat-box">
                        <strong>{summary.present}</strong>
                        <span>Present</span>
                      </div>
                      <div className="stat-box">
                        <strong>{summary.absent}</strong>
                        <span>Absent</span>
                      </div>
                      <div className="stat-box">
                        <strong>{summary.leave}</strong>
                        <span>Leave</span>
                      </div>
                    </div>

                    <div className="quick-row">
                      <button
                        className="quick-button"
                        type="button"
                        onClick={() => setSelectedAssignmentId(assignment.id)}
                      >
                        Open calendar
                      </button>

                      <form action={saveAttendanceAction}>
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={assignment.id}
                        />
                        <input
                          type="hidden"
                          name="attendanceDate"
                          value={todayKey}
                        />
                        <input type="hidden" name="status" value="present" />
                        <button className="quick-button alt" type="submit">
                          Mark today present
                        </button>
                      </form>

                      <form action={saveAttendanceAction}>
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={assignment.id}
                        />
                        <input
                          type="hidden"
                          name="attendanceDate"
                          value={todayKey}
                        />
                        <input type="hidden" name="status" value="absent" />
                        <button className="quick-button ghost" type="submit">
                          Mark today absent
                        </button>
                      </form>
                    </div>

                    <div className={`status-pill ${meta.className}`}>
                      Today: {meta.label}
                    </div>

                    <details className="staff-meta">
                      <summary>More options</summary>
                      <div className="staff-meta-row">
                        <form action={resetStaffPinAction}>
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />
                          <button className="text-link" type="submit">
                            Reset PIN
                          </button>
                        </form>
                        <form
                          action={deactivateAssignmentAction}
                          onSubmit={(event) => {
                            if (
                              !confirm(
                                `Remove ${assignment.staff?.full_name} from this household?`
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />
                          <button className="text-link danger" type="submit">
                            Remove from household
                          </button>
                        </form>
                      </div>
                      {assignment.monthly_salary ? (
                        <p className="staff-meta-line">
                          Monthly salary: ₹{Number(assignment.monthly_salary).toLocaleString("en-IN")}
                        </p>
                      ) : null}
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {selected ? (
          <section className="card calendar-panel">
            <div className="section-heading row">
              <div>
                <p className="section-kicker">Calendar</p>
                <h2>{selected.staff?.full_name}</h2>
              </div>
              <div className="month-controls">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}
                >
                  Previous
                </button>
                <p className="month-label">{formatMonthLabel(currentMonth)}</p>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="summary-strip">
              <SummaryChip
                value={summaries[selected.id]?.present || 0}
                label="Present"
                cls="status-present"
              />
              <SummaryChip
                value={summaries[selected.id]?.absent || 0}
                label="Absent"
                cls="status-absent"
              />
              <SummaryChip
                value={summaries[selected.id]?.leave || 0}
                label="Leave"
                cls="status-leave"
              />
              <SummaryChip
                value={summaries[selected.id]?.unmarked || 0}
                label="Open"
                cls="status-empty"
              />
            </div>

            <div className="calendar-wrap">
              <div className="weekday-row" aria-hidden="true">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
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
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setSelectedDate(day.dateKey);
                        setCurrentMonth(monthKey(dateKeyToDate(day.dateKey)));
                      }}
                    >
                      <div className="day-top">
                        <span className="day-number">{day.dayOfMonth}</span>
                        {record.note ? (
                          <span className="note-mark" aria-hidden="true"></span>
                        ) : null}
                      </div>
                      <span className={`status-pill ${meta.className}`}>
                        {meta.short}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="editor-panel">
              <div className="section-heading compact">
                <p className="section-kicker">Day details</p>
                <h3>{formatFullDate(selectedDate)}</h3>
              </div>

              <form action={saveAttendanceAction} className="editor-form">
                <input
                  type="hidden"
                  name="assignmentId"
                  value={selected.id}
                />
                <input
                  type="hidden"
                  name="attendanceDate"
                  value={selectedDate}
                />
                <input type="hidden" name="status" value={draftStatus} />

                <div className="status-button-row four">
                  {["present", "absent", "leave", "half_day"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`status-button ${
                        draftStatus === s ? "is-active" : ""
                      }`}
                      onClick={() => setDraftStatus(s)}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>

                <label className="field">
                  <span>Note</span>
                  <textarea
                    name="note"
                    rows="2"
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="Festival, half day, late, etc."
                  />
                </label>

                <button className="primary-button" type="submit">
                  Save attendance
                </button>
              </form>
            </div>
          </section>
        ) : null}

        <section className="card insights-panel">
          <div className="section-heading">
            <p className="section-kicker">Recent</p>
            <h2>Activity</h2>
          </div>

          <div className="recent-list">
            {[...attendance]
              .sort((a, b) => {
                const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
                const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
                return tb - ta;
              })
              .slice(0, 8)
              .map((entry) => {
                const assignment = assignments.find(
                  (a) => a.id === entry.assignment_id
                );
                const meta = STATUS_META[entry.status] || STATUS_META.empty;
                return (
                  <div key={entry.id} className="recent-item">
                    <div>
                      <strong>{formatMediumDate(entry.attendance_date)}</strong>
                      <p>
                        {assignment?.staff?.full_name || "Staff"} ·{" "}
                        {entry.note || "—"}
                      </p>
                    </div>
                    <span className={`status-pill ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}

            {attendance.length === 0 ? (
              <div className="recent-item">
                <div>
                  <strong>No attendance yet</strong>
                  <p>Once you mark days, the latest will appear here.</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}

function FreshCredentialsCard({ credentials }) {
  const heading =
    credentials.staffMode === "reset"
      ? "New PIN issued"
      : "Staff added — share these credentials";
  const text =
    credentials.staffMode === "reset"
      ? `Share this new PIN with ${credentials.staffName || "the staff"} on WhatsApp. The old PIN no longer works.`
      : `Share these with ${credentials.staffName || "the staff"} on WhatsApp. They open the staff sign-in page, enter the code and PIN.`;

  const message = `Hi ${credentials.staffName || ""}, your attendance login:\nCode: ${credentials.staffCode}\nPIN: ${credentials.staffPin}\nOpen: ${typeof window !== "undefined" ? window.location.origin : ""}/sign-in/staff`;

  return (
    <section className="card credentials-card">
      <div className="section-heading">
        <p className="section-kicker">One-time</p>
        <h2>{heading}</h2>
        <p className="hero-text">{text}</p>
      </div>

      <div className="credentials-grid">
        <div className="credential-chip">
          <span>Code</span>
          <strong>{credentials.staffCode}</strong>
        </div>
        <div className="credential-chip">
          <span>PIN</span>
          <strong>{credentials.staffPin}</strong>
        </div>
      </div>

      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(message);
          }
        }}
      >
        Copy WhatsApp message
      </button>

      <p className="banner-note subtle">
        We don&apos;t store the PIN. If they lose it, use “Reset PIN” on their card.
      </p>
    </section>
  );
}

function AddStaffForm({ onClose }) {
  const [mode, setMode] = useState("new");

  return (
    <section className="card add-staff-card">
      <div className="section-heading row">
        <div>
          <p className="section-kicker">Add staff</p>
          <h2>{mode === "new" ? "New staff" : "Existing staff (with code)"}</h2>
        </div>
        <button type="button" className="text-link" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-button ${mode === "new" ? "is-active" : ""}`}
          onClick={() => setMode("new")}
        >
          New person
        </button>
        <button
          type="button"
          className={`mode-button ${mode === "reuse" ? "is-active" : ""}`}
          onClick={() => setMode("reuse")}
        >
          Use existing code
        </button>
      </div>

      <form action={addStaffAction} className="setup-form">
        {mode === "new" ? (
          <>
            <label className="field">
              <span>Full name</span>
              <input name="fullName" type="text" placeholder="Sita Devi" required />
            </label>
            <label className="field">
              <span>Phone (optional)</span>
              <input name="phone" type="tel" placeholder="+91 9xxxxxxxxx" />
            </label>
          </>
        ) : (
          <label className="field">
            <span>Existing staff code</span>
            <input
              name="reuseStaffCode"
              type="text"
              placeholder="ABCDEF"
              required
              autoComplete="off"
              style={{ textTransform: "uppercase" }}
            />
          </label>
        )}

        <div className="input-grid">
          <label className="field">
            <span>Role</span>
            <select name="role" defaultValue="cook" required>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Monthly salary (₹, optional)</span>
            <input name="monthlySalary" type="number" min="0" placeholder="6000" />
          </label>
        </div>

        <label className="field">
          <span>Start date (optional)</span>
          <input name="startDate" type="date" />
        </label>

        <button className="primary-button" type="submit">
          {mode === "new" ? "Add and generate PIN" : "Add to household"}
        </button>
      </form>
    </section>
  );
}

function LeaveFeed({ leaves, assignments }) {
  return (
    <section className="card leave-inbox">
      <div className="section-heading">
        <p className="section-kicker">Leaves applied</p>
        <h2>Recent leaves your staff filed</h2>
      </div>

      <div className="leave-list">
        {leaves.map((leave) => {
          const assignment = assignments.find((a) => a.id === leave.assignment_id);
          return (
            <article key={leave.id} className="leave-item">
              <div>
                <p className="leave-name">
                  {assignment?.staff?.full_name || "Staff"}{" "}
                  <span className="muted">· {capitalise(assignment?.role || "")}</span>
                </p>
                <p className="leave-dates">
                  {formatMediumDate(leave.start_date)}
                  {leave.start_date === leave.end_date
                    ? ""
                    : ` → ${formatMediumDate(leave.end_date)}`}
                </p>
                {leave.reason ? <p className="leave-reason">{leave.reason}</p> : null}
              </div>
              <span className="status-pill status-leave">Leave</span>
            </article>
          );
        })}
      </div>
    </section>
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

// ---------------- helpers (date + summaries) ----------------

function buildSummaries(assignments, records, month) {
  const days = getDaysInMonth(month);
  const out = {};
  for (const a of assignments) {
    let present = 0,
      absent = 0,
      leave = 0,
      half = 0;
    for (let d = 1; d <= days; d += 1) {
      const k = `${month}-${String(d).padStart(2, "0")}`;
      const status = getRecord(records, a.id, k).status;
      if (status === "present") present += 1;
      else if (status === "absent") absent += 1;
      else if (status === "leave") leave += 1;
      else if (status === "half_day") half += 1;
    }
    const marked = present + absent + leave + half;
    out[a.id] = {
      present,
      absent,
      leave,
      half,
      unmarked: days - marked,
      attendanceRate: Math.round((marked / days) * 100),
    };
  }
  return out;
}

function zeroSummary() {
  return { present: 0, absent: 0, leave: 0, half: 0, unmarked: 0, attendanceRate: 0 };
}

function getRecord(records, assignmentId, recordDateKey) {
  const entry = records.find(
    (r) => r.assignment_id === assignmentId && r.attendance_date === recordDateKey
  );
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
    return {
      dateKey: dateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === base.getMonth(),
    };
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function dateKeyToDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(monthKeyToDate(value));
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateKeyToDate(value));
}

function formatMediumDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateKeyToDate(value));
}

function capitalise(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
