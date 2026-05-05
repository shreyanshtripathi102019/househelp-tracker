import Link from "next/link";

export default function HomePage() {
  return (
    <div className="lp-root">
      {/* ── Nav ── */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="lp-logo" aria-label="ARIT Home">
            <AritA />
            <span className="lp-wordmark">ARIT</span>
          </Link>
          <span className="lp-pill-tag">ARIT Home</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        {/* decorative circles */}
        <div className="lp-circle lp-circle-tl" aria-hidden="true" />
        <div className="lp-circle lp-circle-br" aria-hidden="true" />

        <div className="lp-hero-content">
          <p className="lp-eyebrow">Household staff management</p>
          <h1 className="lp-headline">
            Track attendance.<br />
            Stress less.
          </h1>
          <p className="lp-sub">
            Owners mark days, share a PIN with helpers, and
            everyone sees the same calendar. No app download needed.
          </p>

          <div className="lp-actions">
            <Link className="lp-btn-dark" href="/sign-in/owner">
              I&apos;m a homeowner
            </Link>
            <Link className="lp-btn-green" href="/sign-in/staff">
              I&apos;m household staff
            </Link>
          </div>

          <p className="lp-footnote">
            Staff sign in with a short code and PIN — no email required.
          </p>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="lp-features">
        <div className="lp-features-inner">
          <div className="lp-feat">
            <p className="lp-feat-title">Daily attendance</p>
            <p className="lp-feat-body">Mark present, absent, leave or half-day. Monthly summaries for every staff member.</p>
          </div>
          <div className="lp-feat-divider" />
          <div className="lp-feat">
            <p className="lp-feat-title">No email, no app</p>
            <p className="lp-feat-body">Staff use a 6-character code and PIN you share on WhatsApp. Works on any phone.</p>
          </div>
          <div className="lp-feat-divider" />
          <div className="lp-feat">
            <p className="lp-feat-title">Leave requests</p>
            <p className="lp-feat-body">Staff apply for leave from their phone. It reflects on your calendar instantly.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <Link href="https://arit.co.in" className="lp-logo" target="_blank">
            <AritA small />
            <span className="lp-wordmark">ARIT</span>
          </Link>
          <p className="lp-footer-text">
            Part of <a href="https://arit.co.in" target="_blank" rel="noopener noreferrer">ARIT</a> — your financial OS for real life in India.
          </p>
        </div>
      </footer>
    </div>
  );
}

function AritA({ small }) {
  const s = small ? 20 : 26;
  return (
    <svg width={s} height={s} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M13 3L22 21H4L13 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="8.5" y1="15.5" x2="17.5" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
