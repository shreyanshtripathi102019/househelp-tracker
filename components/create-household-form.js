"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createHouseholdAction } from "@/app/dashboard/actions";

export default function CreateHouseholdForm({ setupError, detailNote }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createHouseholdAction,
    null
  );

  // Navigate to dashboard once the action reports success.
  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  const errorMessage = state?.error || setupError || null;

  return (
    <form action={formAction} className="setup-form">
      {errorMessage ? (
        <p className="banner-note" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {!state?.error && detailNote ? (
        <p className="banner-note subtle">{detailNote}</p>
      ) : null}

      <label className="field">
        <span>Household name</span>
        <input
          name="householdName"
          type="text"
          placeholder="Tripathi Home"
          required
          disabled={pending || state?.success}
        />
      </label>

      <button
        className="primary-button"
        type="submit"
        disabled={pending || state?.success}
      >
        {pending || state?.success ? "Creating…" : "Create household"}
      </button>
    </form>
  );
}
