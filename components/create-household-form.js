"use client";

import { useState } from "react";

export default function CreateHouseholdForm() {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdName: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Server error (${res.status}). Check Vercel logs.`);
        setPending(false);
        return;
      }

      // Hard navigation — no framework magic, guaranteed to reload the dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      setError(`Error: ${err.message}`);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="setup-form">
      {error ? (
        <p
          className="banner-note"
          role="alert"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          {error}
        </p>
      ) : null}

      <label className="field">
        <span>Household name</span>
        <input
          type="text"
          placeholder="Tripathi Home"
          required
          disabled={pending}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create household"}
      </button>
    </form>
  );
}
