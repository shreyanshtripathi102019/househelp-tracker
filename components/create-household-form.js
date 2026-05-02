"use client";

import { useActionState } from "react";
import { createHouseholdAction } from "@/app/dashboard/actions";

export default function CreateHouseholdForm({ setupError, detailNote }) {
  const [state, formAction, pending] = useActionState(
    createHouseholdAction,
    null
  );

  // Prefer inline action-state error over the URL-based error passed from
  // the server component (which only appears on the first load after a redirect).
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
