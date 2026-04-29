"use client";

import { useEffect, useState } from "react";
import { saveAttendanceAction } from "@/app/dashboard/actions";

const STATUS_META = {
  present: {
    label: "Present",
    shortLabel: "Present",
    className: "status-present",
  },
  absent: {
    label: "Absent",
    shortLabel: "Absent",
    className: "status-absent",
  },
  leave: {
    label: "Leave",
    shortLabel: "Leave",
    className: "status-leave",
  },
  empty: {
    label: "Not marked",
    shortLabel: "Open",
    className: "status-empty",
  },
};

export default function AttendanceWorkspace({
  household,
  workers,
  records,
  viewerRole,
  userEmail,
}) {
  const canEdit = viewerRole === "owner" || viewerRole === "admin";
  const defaultWorkerId = workers[0]?.id || null;
  const [mode, setMode] = useState(canEdit ? "owner" : "staff");
  const [selectedWorkerId, setSelectedWorkerId] = useState(defaultWorkerId);
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));

  const selectedWorker =
    workers.find((worker) => worker.id === selectedWorkerId) || workers[0] || null;
  const selectedRecord = getRecord(records, selectedWorker?.id, selectedDate);
  const [draftStatus, setDraftStatus] = useState(
    selectedRecord.status === "empty" ? "present" : selectedRecord.status
  );
  const [draftNote, setDraftNote] = useState(selectedRecord.note);

  useEffect(() => {
    setDraftStatus(selectedRecord.status === "empty" ? "present" : selectedRecord.status);
    setDraftNote(selectedRecord.note);
  }, [selectedWorkerId, selectedDate, records, selectedRecord.note, selectedRecord.status]);

  if (!selectedWorker) {
    return (
      <section className="card empty-card">
        <p className="section-kicker">No workers yet</p>
        <h2>Add your first househelp records in setup.</h2>
      </section>
    );
  }

  const visibleSummary = buildWorkerSummaries(workers, records, currentMonth);
  const recentItems = buildRecentItems(records, selectedWorker.id);
  const calendarDays = buildCalendarDays(currentMonth);
  const todayKey = dateKey(new Date());
  const ownerSummaryText = canEdit
    ? `Owner mode lets you mark attendance for ${selectedWorker.display_name}.`
    : `This account is linked to ${selectedWorker.display_name} and is read-only.`;

  return (
    <>
      <section className="hero card dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">Household Dashboard</p>
          <h1>{household.name}</h1>
          <p className="hero-text">
            {ownerSummaryText} Signed in as {userEmail || "your account"}.
          </p>
        </div>

        <div className="hero-panel">
          <div className="mode-toggle" role="tablist" aria-label="Portal mode">
            <button
              type="button"
              className={`mode-button ${mode === "owner" ? "is-active" : ""}`}
              onClick={() => canEdit && setMode("owner")}
              aria-selected={mode === "owner"}
              disabled={!canEdit}
            >
              Owner Mode
            </button>
            <button
              type="button"
              className={`mode-button ${mode === "staff" ? "is-active" : ""}`}
              onClick={() => setMode("staff")}
              aria-selected={mode === "staff"}
            >
              Staff View
            </button>
          </div>

          <div className="hero-note">
            <p>
              {mode === "owner" && canEdit
                ? "Select a helper, choose a day, and save attendance with an optional note."
                : "Staff view is safe to share because it does not allow edits."}
            </p>
          </div>

          <form action="/auth/signout" method="post">
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>

      <main className="layout">
        <section className="card roster-panel">
          <div className="section-heading">
            <p className="section-kicker">People</p>
            <h2>Household roster</h2>
          </div>

          <div className="worker-grid">
            {workers.map((worker) => {
              const summary = visibleSummary[worker.id];
              const todayRecord = getRecord(records, worker.id, todayKey);

              return (
                <article
                  key={worker.id}
                  className={`worker-card ${selectedWorkerId === worker.id ? "is-selected" : ""}`}
                >
                  <div className="worker-heading">
                    <div>
                      <p className="worker-role">{formatCategory(worker.category)}</p>
                      <h3 className="worker-name">{worker.display_name}</h3>
                    </div>
                    <span className="worker-tag">{summary.attendanceRate}% marked</span>
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
                      onClick={() => setSelectedWorkerId(worker.id)}
                    >
                      {mode === "owner" ? "Open calendar" : "View record"}
                    </button>

                    {canEdit ? (
                      <>
                        <form action={saveAttendanceAction}>
                          <input type="hidden" name="workerId" value={worker.id} />
                          <input type="hidden" name="attendanceDate" value={todayKey} />
                          <input type="hidden" name="status" value="present" />
                          <input type="hidden" name="note" value="" />
                          <button className="quick-button alt" type="submit">
                            Mark today present
                          </button>
                        </form>

                        <form action={saveAttendanceAction}>
                          <input type="hidden" name="workerId" value={worker.id} />
                          <input type="hidden" name="attendanceDate" value={todayKey} />
                          <input type="hidden" name="status" value="absent" />
                          <input type="hidden" name="note" value="" />
                          <button className="quick-button ghost" type="submit">
                            Mark today absent
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>

                  <div className={`status-pill ${STATUS_META[todayRecord.status].className}`}>
                    Today: {STATUS_META[todayRecord.status].label}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="card calendar-panel">
          <div className="section-heading row">
            <div>
              <p className="section-kicker">Attendance</p>
              <h2>Monthly calendar</h2>
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
            <div className="summary-chip">
              <strong className="status-present">
                {visibleSummary[selectedWorker.id].present}
              </strong>
              <span>Present days</span>
            </div>
            <div className="summary-chip">
              <strong className="status-absent">
                {visibleSummary[selectedWorker.id].absent}
              </strong>
              <span>Absent days</span>
            </div>
            <div className="summary-chip">
              <strong className="status-leave">
                {visibleSummary[selectedWorker.id].leave}
              </strong>
              <span>Leave days</span>
            </div>
            <div className="summary-chip">
              <strong className="status-empty">
                {visibleSummary[selectedWorker.id].unmarked}
              </strong>
              <span>Open days</span>
            </div>
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
                const record = getRecord(records, selectedWorker.id, day.dateKey);

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
                      {record.note ? <span className="note-mark" aria-hidden="true"></span> : null}
                    </div>
                    <span className={`status-pill ${STATUS_META[record.status].className}`}>
                      {STATUS_META[record.status].shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="editor-panel">
            <div className="section-heading compact">
              <p className="section-kicker">Day details</p>
              <h3>
                {selectedWorker.display_name} on {formatFullDate(selectedDate)}
              </h3>
            </div>

            {canEdit && mode === "owner" ? (
              <form action={saveAttendanceAction} className="editor-form">
                <input type="hidden" name="workerId" value={selectedWorker.id} />
                <input type="hidden" name="attendanceDate" value={selectedDate} />
                <input type="hidden" name="status" value={draftStatus} />

                <div className="status-button-row">
                  {["present", "absent", "leave"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`status-button ${draftStatus === status ? "is-active" : ""}`}
                      data-status={status}
                      onClick={() => setDraftStatus(status)}
                    >
                      {STATUS_META[status].label}
                    </button>
                  ))}
                </div>

                <label className="field">
                  <span>Note for this day</span>
                  <textarea
                    name="note"
                    rows="3"
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="Festival leave, late arrival, extra shift, half day"
                  />
                </label>

                <button className="primary-button" type="submit">
                  Save attendance
                </button>
              </form>
            ) : (
              <div className="editor-readonly">
                <div className={`status-pill large-pill ${STATUS_META[selectedRecord.status].className}`}>
                  {STATUS_META[selectedRecord.status].label}
                </div>
                <p className="editor-hint">
                  {selectedRecord.note || "No note added for this day."}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="card insights-panel">
          <div className="section-heading">
            <p className="section-kicker">Staff-friendly view</p>
            <h2>What the helper sees</h2>
          </div>

          <div className="staff-snapshot">
            <p className="snapshot-label">{formatCategory(selectedWorker.category)}</p>
            <p className="snapshot-name">{selectedWorker.display_name}</p>
            <p>
              This view is simple enough to share on a phone so the helper can
              check marked days without confusion.
            </p>

            <div className="snapshot-stats">
              <div className="snapshot-stat">
                <strong>{visibleSummary[selectedWorker.id].present}</strong>
                <span>Present this month</span>
              </div>
              <div className="snapshot-stat">
                <strong>{visibleSummary[selectedWorker.id].absent}</strong>
                <span>Absent this month</span>
              </div>
              <div className="snapshot-stat">
                <strong>{STATUS_META[getRecord(records, selectedWorker.id, todayKey).status].label}</strong>
                <span>Today&apos;s mark</span>
              </div>
            </div>
          </div>

          <div className="recent-panel">
            <div className="section-heading compact">
              <p className="section-kicker">Recent history</p>
              <h3>Latest updates</h3>
            </div>

            <div className="recent-list">
              {recentItems.length ? (
                recentItems.map((entry) => (
                  <div key={entry.id || `${entry.worker_id}-${entry.attendance_date}`} className="recent-item">
                    <div>
                      <strong>{formatMediumDate(entry.attendance_date)}</strong>
                      <p>{entry.note || "No note added"}</p>
                    </div>
                    <span className={`status-pill ${STATUS_META[entry.status].className}`}>
                      {STATUS_META[entry.status].label}
                    </span>
                  </div>
                ))
              ) : (
                <div className="recent-item">
                  <div>
                    <strong>No attendance marked yet</strong>
                    <p>Once you save entries, the latest days will appear here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function buildWorkerSummaries(workers, records, month) {
  const daysInMonth = getDaysInMonth(month);

  return Object.fromEntries(
    workers.map((worker) => {
      let present = 0;
      let absent = 0;
      let leave = 0;

      for (let day = 1; day <= daysInMonth; day += 1) {
        const status = getRecord(records, worker.id, `${month}-${String(day).padStart(2, "0")}`).status;

        if (status === "present") {
          present += 1;
        }
        if (status === "absent") {
          absent += 1;
        }
        if (status === "leave") {
          leave += 1;
        }
      }

      const marked = present + absent + leave;
      return [
        worker.id,
        {
          present,
          absent,
          leave,
          unmarked: daysInMonth - marked,
          attendanceRate: Math.round((marked / daysInMonth) * 100),
        },
      ];
    })
  );
}

function buildCalendarDays(month) {
  const base = monthKeyToDate(month);
  const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      dateKey: dateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === base.getMonth(),
    };
  });
}

function buildRecentItems(records, workerId) {
  return records
    .filter((entry) => entry.worker_id === workerId)
    .sort((left, right) => {
      const rightTime = right.updated_at ? Date.parse(right.updated_at) : Date.parse(right.attendance_date);
      const leftTime = left.updated_at ? Date.parse(left.updated_at) : Date.parse(left.attendance_date);
      return rightTime - leftTime;
    })
    .slice(0, 6);
}

function getRecord(records, workerId, recordDateKey) {
  const entry = records.find(
    (record) => record.worker_id === workerId && record.attendance_date === recordDateKey
  );

  return {
    status: entry?.status || "empty",
    note: entry?.note || "",
  };
}

function getDaysInMonth(month) {
  const [year, monthValue] = month.split("-").map(Number);
  return new Date(year, monthValue, 0).getDate();
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyToDate(value) {
  const [year, monthValue] = value.split("-").map(Number);
  return new Date(year, monthValue - 1, 1);
}

function shiftMonth(value, amount) {
  const date = monthKeyToDate(value);
  date.setMonth(date.getMonth() + amount);
  return monthKey(date);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function dateKeyToDate(value) {
  const [year, monthValue, day] = value.split("-").map(Number);
  return new Date(year, monthValue - 1, day);
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

function formatCategory(value) {
  if (!value) {
    return "House help";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
