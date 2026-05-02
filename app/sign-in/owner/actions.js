"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/env";

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

  const supabase = await createClient();
  const redirectTo = `${getSiteUrl()}/auth/confirm?next=/dashboard`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    redirect("/sign-in/owner?error=auth");
  }

  redirect("/sign-in/owner?sent=1");
}
