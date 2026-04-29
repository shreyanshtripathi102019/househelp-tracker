# Arit Househelp Portal

This project has been converted from a browser-only prototype into a `Next.js + Supabase` app structure that is ready for:

- frontend deployment on Vercel
- authentication with Supabase
- multi-household data in Postgres
- row-level security for owners and workers

## Stack

- Next.js App Router
- Supabase Auth with SSR helpers
- Supabase Postgres
- Next.js `proxy.js` session refresh pattern

## Local setup

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local`.
3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. In Supabase SQL Editor, run:

```sql
supabase/migrations/20260429_init_househelp_portal.sql
```

5. Install dependencies and run the app:

```bash
npm install
npm run dev
```

6. Open `http://localhost:3000`.

## GitHub setup

This local folder can be pushed directly to:

- `https://github.com/shreyanshtripathi102019/househelp-tracker`

Suggested first push flow:

```bash
git init
git branch -M main
git remote add origin https://github.com/shreyanshtripathi102019/househelp-tracker.git
git add .
git commit -m "Initial househelp tracker app"
git push -u origin main
```

## Supabase setup

1. Create a new Supabase project.
2. Run the SQL in:

```sql
supabase/migrations/20260429_init_househelp_portal.sql
```

3. In Supabase Auth settings, set:

- Site URL: `http://localhost:3000` for local work
- Redirect URLs:
  - `http://localhost:3000/auth/confirm`
  - your future Vercel production URL + `/auth/confirm`
  - your future custom domain URL + `/auth/confirm`

4. Copy the project values into `.env.local`.

## Vercel setup

1. Import the GitHub repo into Vercel.
2. Framework preset: `Next.js`
3. Add environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```

4. Deploy.
5. After deployment, add the production Vercel URL into Supabase redirect URLs.
6. Later, when you attach `arit.co.in` or a product path, update `NEXT_PUBLIC_SITE_URL` and Supabase redirect URLs again.

## Current product flow

- `/` gives the product overview
- `/sign-in` sends a magic link email
- `/dashboard` is the protected household attendance workspace
- first signed-in user creates the initial household and the default `Cook` and `Cleaner`

## Current database model

- `households`
- `workers`
- `household_members`
- `attendance_records`

## Notes

- The app is deployed later on your own domain, but the code is already structured for Vercel.
- Email magic links are the fastest first auth path. Later, worker access can move to phone OTP.
- If you want to mount this later under `arit.co.in/products/...`, we can either:
  - merge it into the main Next.js app, or
  - keep it separate and route by path using Vercel rewrites.
