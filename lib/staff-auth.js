// Staff log in with a short alphanumeric "code" (the username) and a 6-digit PIN
// (the password). Internally each staff is a Supabase auth.users row whose
// email is "<code>@staff.arit.local". This module owns code/PIN generation
// and the synthetic-email mapping.

const STAFF_EMAIL_DOMAIN = "staff.arit.local";

// Avoid letters that look like numbers (0/O, 1/I) so spoken codes don't get
// misheard when the owner reads them out to the staff.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const PIN_LENGTH = 6;

export function generateStaffCode() {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    out += CODE_ALPHABET[index];
  }
  return out;
}

export function generateStaffPin() {
  let out = "";
  for (let i = 0; i < PIN_LENGTH; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

export function staffEmailFromCode(code) {
  return `${normaliseStaffCode(code)}@${STAFF_EMAIL_DOMAIN}`.toLowerCase();
}

export function normaliseStaffCode(code) {
  return String(code || "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function isValidStaffCode(code) {
  const normalised = normaliseStaffCode(code);
  return normalised.length === CODE_LENGTH && /^[A-Z0-9]+$/.test(normalised);
}

export function isValidStaffPin(pin) {
  const trimmed = String(pin || "").trim();
  return trimmed.length === PIN_LENGTH && /^[0-9]+$/.test(trimmed);
}

export const STAFF_PIN_LENGTH = PIN_LENGTH;
export const STAFF_CODE_LENGTH = CODE_LENGTH;
