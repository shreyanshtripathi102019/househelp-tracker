"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/env";

export async function requestMagicLinkAction(formData) {
  if (!hasSupabaseEnv()) {
    redirect("/sign-in?error=config");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/sign-in?error=email");
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
    redirect("/sign-in?error=auth");
  }

  redirect("/sign-in?sent=1");
}
