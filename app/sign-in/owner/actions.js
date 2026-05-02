"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/env";
import { sendMagicLinkEmail } from "@/lib/email";

export async function requestOwnerMagicLinkAction(formData) {
  if (!hasSupabaseEnv()) {
    redirect("/sign-in/owner?error=config");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/sign-in/owner?error=email");
  }

  const admin = createAdminClient();
  const redirectTo = `${getSiteUrl()}/auth/confirm?next=/dashboard`;

  // Generate the magic link server-side using the admin API so we can send it
  // ourselves via Google Workspace SMTP instead of Supabase's built-in mailer.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.hashed_token) {
    console.error("generateLink error", error);
    redirect("/sign-in/owner?error=auth");
  }

  // Build our own confirm URL using the hashed_token instead of action_link.
  // action_link goes via Supabase's auth server with PKCE, which fails because
  // no code verifier was ever stored in the user's browser (link was generated
  // server-side). Using token_hash + verifyOtp in /auth/confirm avoids PKCE.
  const confirmUrl =
    `${getSiteUrl()}/auth/confirm` +
    `?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
    `&type=magiclink` +
    `&next=/dashboard`;

  try {
    await sendMagicLinkEmail(email, confirmUrl);
  } catch (mailError) {
    console.error("sendMagicLinkEmail error", mailError);
    redirect("/sign-in/owner?error=mail");
  }

  redirect("/sign-in/owner?sent=1");
}
