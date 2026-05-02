# Arit Househelp Portal

A simple attendance + leaves portal for households and the staff who work in
them. Owners sign in with email; staff sign in with a 6-letter code and a
6-digit PIN that the owner shares with them on WhatsApp. No SMS provider, no
email setup for staff.

## Stack

- Next.js 16 (App Router) deployed on Vercel
- Supabase Auth (email magic link for owners, synthetic email + PIN for staff)
- Supabase Postgres with row-level security
- `proxy.js` for session refresh (Next.js 16 renamed middleware → proxy)

## Roles

- **Owner** — runs the household. Adds staff, marks attendance, sees leaves.
- **Staff** — works in one or more households. Marks own attendance, applies
  leaves. Each leave is auto-approved (the owner is trusted to override later
  if needed).

## Local setup

1. Install Node.js 20+.
2. `cp .env.example .env.local` and fill it in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, never to the browser
```

3. In the Supabase SQL editor, run the **latest** migration only (it wipes
   the v1 tables before recreating):

```
supabase/migrations/20260501_rebuild_portal.sql
```

4. In Supabase → Auth → URL Configuration, allow these redirects:

- `http://localhost:3000/auth/confirm`
- `https://<your-vercel-domain>/auth/confirm`
- (later) `https://<your-arit-subdomain>/auth/confirm`

5. Run it:

```
npm install
npm run dev
```

6. Open `http://localhost:3000`.

## Deploying to Vercel

1. Push to GitHub (`origin/main`). Vercel auto-deploys.
2. In the Vercel project, set the same four env vars as `.env.local`. Make
   sure `SUPABASE_SERVICE_ROLE_KEY` is **not** prefixed with `NEXT_PUBLIC_`.
3. Set `NEXT_PUBLIC_SITE_URL` to the production URL (custom domain when you
   attach one, otherwise the canonical `*.vercel.app`).
4. Add the production URL to Supabase redirect URLs.

## Productizing under arit.co.in

When ready to move off `*.vercel.app`:

- Easiest: subdomain. Point `househelp.arit.co.in` (CNAME) at this Vercel
  project, set the custom domain in Vercel, update `NEXT_PUBLIC_SITE_URL` and
  the Supabase redirect URL. Cookies stay scoped to that subdomain so each
  arit sub-product (payroll, etc.) gets its own auth.

## Routes

- `/` — landing, two tiles (homeowner / househelp)
- `/sign-in` — chooser
- `/sign-in/owner` — email magic link
- `/sign-in/staff` — code + PIN
- `/dashboard` — owner: roster, calendar, add-staff form, leave feed
- `/staff/dashboard` — staff: today, big mark buttons, apply leave, history
- `/auth/confirm` — magic link callback
- `/auth/signout` — POST signs out and redirects to `/sign-in`

## Database

| table              | what it stores                                      |
| ------------------ | --------------------------------------------------- |
| households         | one per home, owned by a Supabase auth user         |
| staff_profiles     | the human (full_name, phone, staff_code, auth user) |
| staff_assignments  | many-to-many link between staff and households      |
| attendance_records | one row per (assignment, date)                      |
| leave_requests     | one row per leave request (kept as history)         |

Row-level security enforces:

- owners see / write only their own households and the staff assigned to them
- staff see / write only their own assignments, attendance, leaves
- the service-role key is used server-side to provision new staff auth users

## How staff sign-in works (no SMS, no email)

When the owner adds a new staff:

1. We generate a random 6-letter `staff_code` (e.g. `KQ3MWX`) and a random
   6-digit `pin`.
2. We create a Supabase auth user with email `<staff_code>@staff.arit.local`
   and password `<pin>` (using the service-role client).
3. The plaintext PIN is shown to the owner **once** in a banner — they copy
   the WhatsApp message and send it to the staff. We never store the PIN.
4. Staff opens `/sign-in/staff`, types the code + PIN, and we sign them in
   with `signInWithPassword({ email: <code>@staff.arit.local, password })`.

If the staff forgets the PIN, the owner clicks "Reset PIN" on the staff card.
The same staff_code stays valid; only the PIN rotates. Staff who work in
multiple households share one staff_code (and one PIN) across all of them.
