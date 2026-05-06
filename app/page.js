import Link from "next/link";

export default function HomePage() {
  return (
    <div className="lp-root">
      {/* ── Nav ── */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="lp-logo" aria-label="ARIT Home">
            <img src="/arit-logo.svg" alt="" width={32} height={38} className="lp-logo-img" />
            <span className="lp-wordmark">ARIT</span>
            <span className="lp-nav-sep" aria-hidden="true" />
            <span className="lp-nav-product">Home</span>
          </Link>
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

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <Link href="https://arit.co.in" className="lp-logo" target="_blank" rel="noopener noreferrer">
            <img src="/arit-logo.png" alt="" width={22} height={26} className="lp-logo-img" />
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

