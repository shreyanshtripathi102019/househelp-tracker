"use client";

// Thin client wrapper so the error banner and disabled state work,
// but navigation on success is handled by the server action's redirect().
import { useActionState } from "react";
import { createHouseholdAction } from "@/app/dashboard/actions";

export default function CreateHouseholdForm({ setupError, detailNote }) {
  const [state, formAction, pending] = useActionState(
    createHouseholdAction,
    null
  );

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
          disabled={pending}
        />
      </label>

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create household"}
      </button>
    </form>
  );
}
