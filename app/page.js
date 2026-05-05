import Link from "next/link";

export default function HomePage() {
  return (
    <div className="lp-root">
      {/* ── Nav ── */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="lp-logo" aria-label="ARIT Home">
            <AritMark />
            <span className="lp-logo-wordmark">ARIT</span>
            <span className="lp-product-badge">Home</span>
          </Link>

          <nav className="lp-nav-links">
            <Link className="lp-nav-signin" href="/sign-in/owner">
              Owner sign in
            </Link>
            <Link className="lp-nav-signin secondary" href="/sign-in/staff">
              Staff sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <p className="lp-eyebrow">Household staff management</p>
          <h1 className="lp-headline">
            Attendance tracking<br />
            your staff can actually use.
          </h1>
          <p className="lp-sub">
            Mark attendance in seconds. Your cook, cleaner, or driver signs in
            with a simple code — no email, no app download needed.
          </p>

          <div className="lp-ctas">
            <Link className="lp-cta-primary" href="/sign-in/owner">
              Get started as owner
              <ArrowRight />
            </Link>
            <Link className="lp-cta-secondary" href="/sign-in/staff">
              I&apos;m a household staff
            </Link>
          </div>
        </div>

        <div className="lp-hero-visual" aria-hidden="true">
          <HeroIllustration />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <div className="lp-features-inner">
          <div className="lp-feature">
            <div className="lp-feature-icon">
              <CalendarIcon />
            </div>
            <h3>Daily attendance</h3>
            <p>
              Mark present, absent, leave, or half-day. Full calendar view with
              monthly summaries for every staff member.
            </p>
          </div>

          <div className="lp-feature">
            <div className="lp-feature-icon">
              <PinIcon />
            </div>
            <h3>No email required</h3>
            <p>
              Staff sign in with a short code and PIN you share on WhatsApp.
              Works on any phone, no app needed.
            </p>
          </div>

          <div className="lp-feature">
            <div className="lp-feature-icon">
              <LeaveIcon />
            </div>
            <h3>Leave tracking</h3>
            <p>
              Staff apply for leave from their phone. It shows up instantly on
              your calendar so you&apos;re never caught off-guard.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-how">
        <div className="lp-how-inner">
          <h2 className="lp-section-title">Set up in under 2 minutes</h2>
          <div className="lp-steps">
            <div className="lp-step">
              <span className="lp-step-num">1</span>
              <div>
                <strong>Create your household</strong>
                <p>Sign up with your email and name your household.</p>
              </div>
            </div>
            <div className="lp-step">
              <span className="lp-step-num">2</span>
              <div>
                <strong>Add your staff</strong>
                <p>Enter their name and role — a code and PIN are generated instantly.</p>
              </div>
            </div>
            <div className="lp-step">
              <span className="lp-step-num">3</span>
              <div>
                <strong>Share on WhatsApp</strong>
                <p>Send the code and PIN — your staff can sign in right away.</p>
              </div>
            </div>
          </div>

          <div className="lp-how-cta">
            <Link className="lp-cta-primary" href="/sign-in/owner">
              Create your account
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <Link href="https://arit.co.in" className="lp-logo small" target="_blank">
            <AritMark small />
            <span className="lp-logo-wordmark">ARIT</span>
          </Link>
          <p className="lp-footer-copy">
            Part of <a href="https://arit.co.in" target="_blank" rel="noopener">ARIT</a> — your financial OS for real life in India.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function AritMark({ small }) {
  const size = small ? 22 : 28;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#1d4435" />
      <path
        d="M14 6L20.5 20H7.5L14 6Z"
        fill="none"
        stroke="#f7efe1"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <line x1="10" y1="16" x2="18" y2="16" stroke="#f7efe1" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 2v4M16 2v4M3 9h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="14" r="1.2" fill="currentColor" />
      <circle cx="12" cy="14" r="1.2" fill="currentColor" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3C8 3 5 6.5 5 10c0 5.25 7 11 7 11s7-5.75 7-11c0-3.5-3-7-7-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <svg viewBox="0 0 340 260" fill="none" className="lp-hero-svg" aria-hidden="true">
      {/* Card background */}
      <rect x="20" y="20" width="300" height="220" rx="18" fill="#ffffff" stroke="#e8e0d4" strokeWidth="1" />

      {/* Header row */}
      <rect x="36" y="36" width="80" height="8" rx="4" fill="#d4cdc3" />
      <rect x="36" y="50" width="140" height="13" rx="4" fill="#1d4435" />

      {/* Staff row 1 */}
      <rect x="36" y="80" width="268" height="44" rx="10" fill="#f5f0e8" />
      <circle cx="58" cy="102" r="12" fill="#1d4435" opacity=".15" />
      <rect x="78" y="95" width="70" height="8" rx="3" fill="#3a3330" />
      <rect x="78" y="108" width="44" height="6" rx="3" fill="#a8a09a" />
      <rect x="258" y="95" width="36" height="14" rx="6" fill="#d4f0e2" />
      <rect x="262" y="99" width="28" height="6" rx="3" fill="#1d7a55" />

      {/* Staff row 2 */}
      <rect x="36" y="132" width="268" height="44" rx="10" fill="#f5f0e8" />
      <circle cx="58" cy="154" r="12" fill="#1d4435" opacity=".15" />
      <rect x="78" y="147" width="60" height="8" rx="3" fill="#3a3330" />
      <rect x="78" y="160" width="44" height="6" rx="3" fill="#a8a09a" />
      <rect x="258" y="147" width="36" height="14" rx="6" fill="#fdecea" />
      <rect x="262" y="151" width="28" height="6" rx="3" fill="#ab4c3e" />

      {/* Staff row 3 */}
      <rect x="36" y="184" width="268" height="44" rx="10" fill="#f5f0e8" />
      <circle cx="58" cy="206" r="12" fill="#1d4435" opacity=".15" />
      <rect x="78" y="199" width="80" height="8" rx="3" fill="#3a3330" />
      <rect x="78" y="212" width="44" height="6" rx="3" fill="#a8a09a" />
      <rect x="258" y="199" width="36" height="14" rx="6" fill="#fef6e4" />
      <rect x="262" y="203" width="28" height="6" rx="3" fill="#8c6c2e" />
    </svg>
  );
}
