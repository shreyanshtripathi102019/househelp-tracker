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

  // Try to create a fresh user. If the auth account already exists (e.g. from
  // a previous magic-link sign-in), update its password instead so the owner
  // can switch to email+password without losing their account.
  let userId;
  let alreadyConfirmed = false;

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

  if (createError) {
    const msg = createError.message?.toLowerCase() || "";
    if (!msg.includes("already") && !msg.includes("exists")) {
      console.error("signUpOwnerAction createUser error", createError);
      redirect("/sign-in/owner?mode=signup&error=create");
    }

    // Account exists — look it up and update the password.
    const { data: existing, error: lookupError } =
      await admin.auth.admin.getUserByEmail(email);

    if (lookupError || !existing?.user) {
      redirect("/sign-in/owner?mode=signup&error=create");
    }

    userId = existing.user.id;
    alreadyConfirmed = !!existing.user.email_confirmed_at;

    await admin.auth.admin.updateUserById(userId, { password });
  } else {
    userId = created.user.id;
  }

  // If the email is already confirmed (they used magic links before), they can
  // sign in immediately — no need to re-verify.
  if (alreadyConfirmed) {
    redirect("/sign-in/owner?sent=passset");
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
    if (!alreadyConfirmed) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
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
    if (!alreadyConfirmed) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    redirect("/sign-in/owner?mode=signup&error=mail");
  }

  redirect("/sign-in/owner?sent=verify");
}
