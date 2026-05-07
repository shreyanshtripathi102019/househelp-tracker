"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import {
  isValidPhone,
  normalisePhone,
  isValidStaffPin,
  staffEmailFromCode,
} from "@/lib/staff-auth";

export async function staffSignInAction(formData) {
  if (!hasSupabaseEnv()) {
    redirect("/sign-in/staff?error=config");
  }

  const phoneRaw = String(formData.get("phone") || "").trim();
  const pin = String(formData.get("pin") || "").trim();

  if (!phoneRaw || !pin) {
    redirect("/sign-in/staff?error=missing");
  }

  const phone = normalisePhone(phoneRaw);
  if (!isValidPhone(phone)) {
    redirect("/sign-in/staff?error=invalid_phone");
  }

  if (!isValidStaffPin(pin)) {
    redirect("/sign-in/staff?error=invalid_pin");
  }

  // Look up staff profile by phone number
  const admin = createAdminClient();
  const { data: profiles, error: lookupError } = await admin
    .from("staff_profiles")
    .select("id, staff_code, full_name")
    .eq("phone", phone)
    .limit(2);

  if (lookupError || !profiles || profiles.length === 0) {
    redirect("/sign-in/staff?error=not_found");
  }

  // If multiple profiles share the same phone, sign in the first one
  // (edge case — phone should be unique per person)
  const profile = profiles[0];
  const email = staffEmailFromCode(profile.staff_code);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: pin });

  if (error) {
    redirect("/sign-in/staff?error=invalid");
  }

  redirect("/staff/dashboard");
}
