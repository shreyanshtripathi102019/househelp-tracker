"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import {
  isValidStaffCode,
  isValidStaffPin,
  normaliseStaffCode,
  staffEmailFromCode,
} from "@/lib/staff-auth";

export async function staffSignInAction(formData) {
  if (!hasSupabaseEnv()) {
    redirect("/sign-in/staff?error=config");
  }

  const codeRaw = String(formData.get("code") || "").trim();
  const pin = String(formData.get("pin") || "").trim();

  if (!codeRaw || !pin) {
    redirect("/sign-in/staff?error=missing");
  }

  const code = normaliseStaffCode(codeRaw);
  if (!isValidStaffCode(code) || !isValidStaffPin(pin)) {
    redirect("/sign-in/staff?error=invalid");
  }

  const supabase = await createClient();
  const email = staffEmailFromCode(code);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: pin,
  });

  if (error) {
    redirect("/sign-in/staff?error=invalid");
  }

  redirect("/staff/dashboard");
}
