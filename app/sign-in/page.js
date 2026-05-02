import Link from "next/link";

export default function SignInChooserPage() {
  return (
    <main className="page-shell narrow-shell">
      <section className="card auth-card">
        <p className="eyebrow">Sign in</p>
        <h1 className="auth-heading">Who is signing in?</h1>
        <p className="auth-sub">Pick the option that fits you.</p>

        <div className="chooser-grid">
          <Link className="chooser-tile" href="/sign-in/owner">
            <span className="chooser-title">Homeowner</span>
            <span className="chooser-desc">Sign in with email</span>
          </Link>
          <Link className="chooser-tile" href="/sign-in/staff">
            <span className="chooser-title">Househelp</span>
            <span className="chooser-desc">
              Sign in with your phone and PIN
            </span>
          </Link>
        </div>

        <div className="auth-footer">
          <Link className="text-link" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
