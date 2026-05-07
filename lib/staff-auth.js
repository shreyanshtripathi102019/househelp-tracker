// Staff log in with phone + PIN. Internally each staff is a Supabase auth.users
// row whose email is "<staff_code>@staff.arit.local", password is the PIN.
// Phone is stored in staff_profiles.phone and used as the public sign-in
// identifier; we look up the staff_code from the DB and derive the email.

const STAFF_EMAIL_DOMAIN = "staff.arit.local";

// Avoid letters that look like numbers (0/O, 1/I) so spoken codes don't get
// misheard when the owner reads them out to the staff.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const PIN_LENGTH = 4; // 4-digit PIN — simpler for househelp

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

// Phone helpers ────────────────────────────────────────────────────────────────

/** Strip spaces, dashes, parentheses, leading +91 / 0 and return 10 digits */
export function normalisePhone(raw) {
  let s = String(raw || "").replace(/[\s\-().]/g, "");
  // Remove country code +91 or 0
  if (s.startsWith("+91")) s = s.slice(3);
  else if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  else if (s.startsWith("0")) s = s.slice(1);
  return s;
}

export function isValidPhone(raw) {
  const n = normalisePhone(raw);
  return /^[6-9]\d{9}$/.test(n); // Indian mobile numbers
}

export function isValidStaffCode(code) {
  const normalised = normaliseStaffCode(code);
  return normalised.length === CODE_LENGTH && /^[A-Z0-9]+$/.test(normalised);
}

export function isValidStaffPin(pin) {
  const trimmed = String(pin || "").trim();
  return trimmed.length >= 4 && trimmed.length <= 6 && /^[0-9]+$/.test(trimmed);
}

export const STAFF_PIN_LENGTH = PIN_LENGTH;
export const STAFF_CODE_LENGTH = CODE_LENGTH;
