import Link from "next/link";
import { staffSignInAction } from "@/app/sign-in/staff/actions";
import { hasSupabaseEnv } from "@/lib/env";

function getBanner(params) {
  if (params?.error === "config") {
    return "The portal is not configured yet. Ask your employer to try again later.";
  }
  if (params?.error === "missing") return "Please enter both your phone number and PIN.";
  if (params?.error === "invalid_phone") return "Please enter a valid 10-digit mobile number.";
  if (params?.error === "invalid_pin") return "PIN must be 4–6 digits.";
  if (params?.error === "not_found") {
    return "No account found for this phone number. Ask your employer to add your phone.";
  }
  if (params?.error === "invalid") {
    return "Wrong PIN. Ask your employer to reset it if you've forgotten.";
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
        <h1 className="auth-heading">Enter your phone &amp; PIN</h1>
        <p className="auth-sub">
          Your employer shared a PIN with you on WhatsApp. Enter your phone
          number and that PIN to sign in.
        </p>

        {banner ? <p className="banner-note">{banner}</p> : null}

        <form action={staffSignInAction} className="auth-form">
          <label className="field">
            <span>Mobile number</span>
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              placeholder="9XXXXXXXXX"
              autoComplete="tel"
              required
              disabled={!isConfigured}
            />
          </label>

          <label className="field">
            <span>PIN</span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••"
              maxLength={6}
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
