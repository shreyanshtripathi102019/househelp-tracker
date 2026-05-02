import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell narrow-shell">
      <section className="card landing-card">
        <p className="eyebrow">Househelp Portal</p>
        <h1 className="landing-heading">
          A simple way to track househelp attendance.
        </h1>
        <p className="landing-sub">
          Owners mark days, share a PIN with their helpers, and everyone sees
          the same calendar.
        </p>

        <div className="landing-actions">
          <Link className="primary-button" href="/sign-in/owner">
            I&apos;m a homeowner
          </Link>
          <Link className="secondary-button" href="/sign-in/staff">
            I&apos;m a househelp
          </Link>
        </div>

        <p className="landing-foot">
          Staff don&apos;t need an email. The owner shares a 6-digit PIN they
          can type with their phone number.
        </p>
      </section>
    </main>
  );
}
