import Link from "next/link";
import { requestMagicLinkAction } from "@/app/sign-in/actions";
import { hasSupabaseEnv } from "@/lib/env";

function getBanner(params) {
  if (params?.sent === "1") {
    return "Magic link sent. Open the email on the same device and continue to the dashboard.";
  }

  if (params?.error === "config") {
    return "Add your Supabase environment variables before using sign-in.";
  }

  if (params?.error === "email") {
    return "Enter an email address to continue.";
  }

  if (params?.error === "auth") {
    return "Supabase could not send the email link. Check your Auth email settings and redirect URLs.";
  }

  return null;
}

export default async function SignInPage({ searchParams }) {
  const params = (await searchParams) || {};
  const banner = getBanner(params);
  const isConfigured = hasSupabaseEnv();

  return (
    <main className="page-shell compact-shell">
      <section className="card auth-card">
        <div className="section-heading">
          <p className="eyebrow">Access</p>
          <h1>Sign in to the househelp portal</h1>
          <p className="hero-text">
            For the first deploy, email magic links are the fastest way to get the
            owner side working. We can switch workers to phone OTP later.
          </p>
        </div>

        {banner ? <p className="banner-note">{banner}</p> : null}

        <form action={requestMagicLinkAction} className="auth-form">
          <label className="field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              disabled={!isConfigured}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={!isConfigured}>
            Send magic link
          </button>
        </form>

        <div className="auth-footer">
          <Link className="text-link" href="/">
            Back to overview
          </Link>
          <Link className="text-link" href="/dashboard">
            Try dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
