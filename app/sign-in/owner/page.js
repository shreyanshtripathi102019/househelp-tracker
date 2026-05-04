import Link from "next/link";
import { signInOwnerAction, signUpOwnerAction } from "./actions";
import { hasSupabaseEnv } from "@/lib/env";
import OwnerSignInForm from "@/components/owner-sign-in-form";

const BANNERS = {
  // sign-in errors
  config: "Supabase env vars missing.",
  fields: "Please enter both email and password.",
  invalid: "Incorrect email or password. Please try again.",
  unverified: "Please verify your email first — check your inbox for the link we sent.",
  // sign-up errors
  weakpass: "Password must be at least 8 characters.",
  exists: "An account with that email already exists. Sign in instead.",
  create: "Could not create account. Please try again.",
  link: "Account created but verification email failed. Contact support.",
  mail: "Account created but we could not send the email. Check SMTP settings.",
  // success
  verify: "Account created! Check your inbox for a verification link.",
  passset: "Password updated — you can now sign in with your email and password.",
};

export default async function OwnerSignInPage({ searchParams }) {
  const params = (await searchParams) || {};
  const mode = params.mode === "signup" ? "signup" : "signin";
  const isSignUp = mode === "signup";
  const isConfigured = hasSupabaseEnv();

  const bannerKey = params.sent === "verify" ? "verify" : params.error || null;
  const banner = bannerKey ? BANNERS[bannerKey] : null;
  const isSuccess = params.sent === "verify" || params.sent === "passset";

  return (
    <main className="page-shell narrow-shell">
      <section className="card auth-card">
        <p className="eyebrow">Homeowner</p>
        <h1 className="auth-heading">
          {isSignUp ? "Create account" : "Sign in"}
        </h1>
        <p className="auth-sub">
          {isSignUp
            ? "Enter your email and choose a password. We'll send a verification link."
            : "Enter your email and password to access your dashboard."}
        </p>

        {banner ? (
          <p className={`banner-note${isSuccess ? " success" : ""}`}>
            {banner}
          </p>
        ) : null}

        {!isSuccess && isConfigured && (
          <OwnerSignInForm
            action={isSignUp ? signUpOwnerAction : signInOwnerAction}
            isSignUp={isSignUp}
          />
        )}
        {!isConfigured && (
          <p className="banner-note">Supabase is not configured.</p>
        )}

        <div className="auth-footer">
          <Link className="text-link" href="/sign-in">
            Back
          </Link>
          {isSignUp ? (
            <Link className="text-link" href="/sign-in/owner">
              Already have an account?
            </Link>
          ) : (
            <Link className="text-link" href="/sign-in/owner?mode=signup">
              Create account
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
