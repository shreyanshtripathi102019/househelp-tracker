import Link from "next/link";
import { requestOwnerMagicLinkAction } from "@/app/sign-in/owner/actions";
import { hasSupabaseEnv } from "@/lib/env";

function getBanner(params) {
  if (params?.sent === "1") {
    return "Magic link sent. Open it on this device to continue.";
  }
  if (params?.error === "config") return "Supabase env vars missing.";
  if (params?.error === "email") return "Enter an email address to continue.";
  if (params?.error === "auth") {
    return "Could not generate the sign-in link. Check the address and try again.";
  }
  if (params?.error === "mail") {
    return "Link generated but email delivery failed. Check SMTP_USER and SMTP_PASSWORD in your environment.";
  }
  return null;
}

export default async function OwnerSignInPage({ searchParams }) {
  const params = (await searchParams) || {};
  const banner = getBanner(params);
  const isConfigured = hasSupabaseEnv();

  return (
    <main className="page-shell narrow-shell">
      <section className="card auth-card">
        <p className="eyebrow">Homeowner sign in</p>
        <h1 className="auth-heading">Sign in with email</h1>
        <p className="auth-sub">
          We&apos;ll send a one-time link. Open it on this device.
        </p>

        {banner ? <p className="banner-note">{banner}</p> : null}

        <form action={requestOwnerMagicLinkAction} className="auth-form">
          <label className="field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={!isConfigured}
              required
            />
          </label>

          <button
            className="primary-button full-width"
            type="submit"
            disabled={!isConfigured}
          >
            Send magic link
          </button>
        </form>

        <div className="auth-footer">
          <Link className="text-link" href="/sign-in">
            Back
          </Link>
          <Link className="text-link" href="/sign-in/staff">
            I&apos;m a househelp
          </Link>
        </div>
      </section>
    </main>
  );
}
