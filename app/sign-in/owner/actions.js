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

  if (error || !data?.properties?.action_link) {
    console.error("generateLink error", error);
    redirect("/sign-in/owner?error=auth");
  }

  try {
    await sendMagicLinkEmail(email, data.properties.action_link);
  } catch (mailError) {
    console.error("sendMagicLinkEmail error", mailError);
    redirect("/sign-in/owner?error=mail");
  }

  redirect("/sign-in/owner?sent=1");
}
