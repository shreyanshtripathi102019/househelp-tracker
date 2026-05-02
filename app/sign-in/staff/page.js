import Link from "next/link";
import { staffSignInAction } from "@/app/sign-in/staff/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { STAFF_CODE_LENGTH, STAFF_PIN_LENGTH } from "@/lib/staff-auth";

function getBanner(params) {
  if (params?.error === "config") {
    return "The portal is not configured yet. Ask your employer to try again later.";
  }
  if (params?.error === "missing") return "Please enter both your code and PIN.";
  if (params?.error === "invalid") {
    return "That code or PIN is not correct. Ask your employer to share again or reset.";
  }
  return null;
}

export default async function StaffSignInPage({ searchParams }) {
  const params = (await searchParams) || {};
  const banner = getBanner(params);
  const isConfigured = hasSupabaseEnv();

  return (
    <main className="page-shell narrow-shell">
      <section className="card auth-card">
        <p className="eyebrow">Househelp sign in</p>
        <h1 className="auth-heading">Enter your code and PIN</h1>
        <p className="auth-sub">
          Your employer shared a {STAFF_CODE_LENGTH}-letter code and a{" "}
          {STAFF_PIN_LENGTH}-digit PIN with you on WhatsApp.
        </p>

        {banner ? <p className="banner-note">{banner}</p> : null}

        <form action={staffSignInAction} className="auth-form">
          <label className="field">
            <span>Code</span>
            <input
              name="code"
              type="text"
              placeholder="ABCDEF"
              autoComplete="off"
              maxLength={STAFF_CODE_LENGTH}
              required
              disabled={!isConfigured}
              className="code-input"
            />
          </label>

          <label className="field">
            <span>PIN</span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••••"
              maxLength={STAFF_PIN_LENGTH}
              autoComplete="current-password"
              required
              disabled={!isConfigured}
              className="pin-input"
            />
          </label>

          <button
            className="primary-button full-width"
            type="submit"
            disabled={!isConfigured}
          >
            Sign in
          </button>
        </form>

        <div className="auth-footer">
          <Link className="text-link" href="/sign-in">
            Back
          </Link>
          <Link className="text-link" href="/sign-in/owner">
            I&apos;m a homeowner
          </Link>
        </div>
      </section>
    </main>
  );
}
