"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/env";
import { sendVerificationEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Sign in with email + password
// ---------------------------------------------------------------------------
export async function signInOwnerAction(formData) {
  if (!hasSupabaseEnv()) redirect("/sign-in/owner?error=config");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) redirect("/sign-in/owner?error=fields");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message?.toLowerCase().includes("email not confirmed")) {
      redirect("/sign-in/owner?error=unverified");
    }
    redirect("/sign-in/owner?error=invalid");
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Create account: provisions the user, sends a verification email via
// Google Workspace SMTP, then waits for them to confirm before sign-in works.
// ---------------------------------------------------------------------------
export async function signUpOwnerAction(formData) {
  if (!hasSupabaseEnv()) redirect("/sign-in/owner?mode=signup&error=config");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) redirect("/sign-in/owner?mode=signup&error=fields");
  if (password.length < 8)
    redirect("/sign-in/owner?mode=signup&error=weakpass");

  const admin = createAdminClient();

  // Create the user without auto-confirming so they must verify their email.
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

  if (createError) {
    const msg = createError.message?.toLowerCase() || "";
    if (msg.includes("already") || msg.includes("exists")) {
      redirect("/sign-in/owner?mode=signup&error=exists");
    }
    console.error("signUpOwnerAction createUser error", createError);
    redirect("/sign-in/owner?mode=signup&error=create");
  }

  // Generate a verification link we can send ourselves.
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: `${getSiteUrl()}/auth/confirm?next=/dashboard`,
      },
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("signUpOwnerAction generateLink error", linkError);
    // User was created — clean up so they can retry.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    redirect("/sign-in/owner?mode=signup&error=link");
  }

  const confirmUrl =
    `${getSiteUrl()}/auth/confirm` +
    `?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}` +
    `&type=signup` +
    `&next=/dashboard`;

  try {
    await sendVerificationEmail(email, confirmUrl);
  } catch (mailError) {
    console.error("sendVerificationEmail error", mailError);
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    redirect("/sign-in/owner?mode=signup&error=mail");
  }

  redirect("/sign-in/owner?sent=verify");
}
