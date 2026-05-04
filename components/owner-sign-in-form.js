"use client";

import { useFormStatus } from "react-dom";

function SubmitButton({ label }) {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button full-width" type="submit" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}

export default function OwnerSignInForm({ action, isSignUp }) {
  return (
    <form action={action} className="auth-form">
      <label className="field">
        <span>Email address</span>
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 8 : 1}
        />
      </label>

      <SubmitButton label={isSignUp ? "Create account" : "Sign in"} />
    </form>
  );
}
