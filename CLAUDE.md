# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (a lightweight npm workspace wrapper):

```bash
npm run install:all      # install Backend + Frontend deps
npm run dev              # backend :5000 + frontend :8080 concurrently
npm run dev:backend      # backend only (node --watch)
npm run dev:frontend     # frontend only (vite)
npm run db:migrate       # apply Backend/supabase/migrations to Supabase Postgres
npm run db:seed          # seed demo accounts + data
```

Frontend (run inside `Frontend/`):
```bash
npm run build            # vite production build → Frontend/dist
npm run lint             # eslint
npm run test             # vitest run (all)
npx vitest run src/test/example.test.ts   # single test file
npx vitest -t "name"     # single test by name
```

Backend has **no test/lint scripts** — only `dev` and `start`. Verify backend changes by booting it and hitting endpoints (e.g. `curl localhost:5000/api/health`, or `GET /api/auth/me` with a Clerk session bearer token).

Node **22+** is required (Supabase JS v2 needs native WebSocket).

## Architecture

Monorepo: a decoupled **React SPA** (`Frontend/`) and an **Express REST API** (`Backend/`) backed by **Supabase** (Postgres + Auth + Storage). In production the Express server also serves the built frontend from `Frontend/dist`, so the whole app ships as one container (`Dockerfile` → Railway). The frontend can alternatively be hosted standalone (`Frontend/vercel.json`) against a separate backend.

### Backend request path
Every domain follows `route → controller → service → Supabase`:
- `src/api/*.routes.js` — thin routers, mounted under `/api` in `src/api/index.js`.
- `src/controllers/*` — parse request, call service, wrap response. All wrapped in `asyncHandler` so thrown errors reach the global handler.
- `src/services/*` — **all business logic and Supabase queries live here.** This is where to make changes.
- `src/models/*.schema.js` — **Zod** schemas, applied via the `validate` middleware in routes.
- Errors: throw `AppError(message, statusCode, code)`; `middleware/errorHandler.js` formats every response as `{ success, data }` or `{ success, error: { message, code } }`. Match this envelope for new endpoints.

Supabase access is centralized in `Backend/supabase/client.js` (re-exported via `src/services/supabase.js`): `supabase` (anon key) and `supabaseAdmin` (service-role, used for auth-admin operations). Realtime is intentionally disabled on the backend.

### Authentication (Clerk)
Auth is **Clerk** — email + password as the primary sign-up/sign-in method, with email-code (OTP) verification required at sign-up and for password reset, plus Google OAuth kept alongside it. Phone auth is disabled. There is no app-issued JWT and no Supabase Auth involved; Supabase is used purely as the Postgres database.
- Frontend: `<ClerkProvider>` wraps the app (`Frontend/src/routes/App.tsx`); `AuthPage.tsx` drives email+password sign-in (`signIn.create({ identifier, password })`, completes immediately) and sign-up (`signUp.create({ emailAddress, password, unsafeMetadata })` then `prepareEmailAddressVerification({ strategy: "email_code" })`), `VerifyOtpPage.tsx` completes email verification for sign-up via `attemptEmailAddressVerification`, `ForgotPasswordPage.tsx` drives password reset via `reset_password_email_code` (`signIn.create({identifier}) → prepareFirstFactor → attemptFirstFactor({code, password})`), `OAuthRole.tsx` handles first-time role selection after Google OAuth (which skips the app's own role toggle).
- `Frontend/src/lib/api.ts` reads the live Clerk session token via `window.Clerk.session.getToken()` on every request (Clerk auto-rotates it internally) and sends it as a Bearer token — no app-side token storage or refresh logic.
- Backend: `middleware/auth.js` uses `@clerk/express`'s `getAuth(req)` to read the verified Clerk user ID off the session, then calls `authService.findOrCreateByClerkId()` to lazily provision (or link) the local `public.users` row.
- `findOrCreateByClerkId()` (`services/auth.service.js`) links by the Clerk identity's email — a pre-existing seed/demo row with a matching `users.email` is linked instead of creating a duplicate.
- `requireRole('BRAND'|'INFLUENCER')` guards role-specific routes.
- **Clerk Dashboard requirements** for this instance: Email address enabled/required with `email_code` verification, **Password enabled**, Phone number disabled. Sign-up bot protection ("Smart"/Turnstile CAPTCHA) is handled transparently by `@clerk/clerk-react`. The app's own Google reCAPTCHA v2 widget (auth forms + contact form) has been removed.

### Frontend
- Feature-sliced under `src/features/` (auth, dashboard, gigs, applications, marketplace). Routing in `src/routes/App.tsx` with `ProtectedRoute` / `RoleRoute` guards.
- `src/lib/api.ts` — axios client with a request interceptor (attaches the live Clerk session token as a Bearer header) and a response interceptor that redirects to `/login` on a 401. Use `unwrap()` to strip the `{ data }` envelope.
- State: **TanStack React Query** for server state, **Zustand** (`src/stores/authStore.ts`, persisted to `localStorage` key `yc.auth`) for the app-side user profile (id/role/name/etc — not the Clerk session itself, which Clerk manages internally).
- UI: shadcn/Radix components in `src/components/ui` and `src/components/common`; Tailwind; forms via react-hook-form + Zod. `@` aliases `Frontend/src`.
- **Dev server runs on port 8080** (not Vite's default 5173) — see CORS allow-list in `Backend/src/index.js`.

### Database
Postgres via Supabase. `npm run db:migrate` (`Backend/supabase/migrate.js`) connects with the raw `pg` client using `DATABASE_URL` (the only place `pg` is used — the app runtime uses the Supabase JS client) and applies **only two files**: `migrations/migration.sql` (base schema) then `migrations/schema.sql` (enhancements). The directory also holds several timestamped Supabase/Lovable-style migration files and `instagram_migration.sql` — `migrate.js` does **not** run these; they're not wired into the migrate script, so if you add schema changes, add them to `migration.sql`/`schema.sql` (or apply the timestamped file manually) or they won't reach a fresh database. Tables: `users`, `brands`, `influencers`, `gigs`, `applications`, `notifications`. `refresh_tokens` and `email_otps` still exist in `migration.sql` but are orphaned leftovers from the pre-Clerk JWT/email-OTP flow — nothing in the app reads or writes them. Note: `messages` and `reviews` tables exist in the schema but have **no API/UI** yet (planned features).

## Environment

Two `.env` files are required (templates in `Backend/.env.example`, `Frontend/.env.example`): Backend needs `CLERK_SECRET_KEY` (fails fast on startup if unset — see `config/index.js`), Supabase keys, `DATABASE_URL`, Gmail SMTP (`GMAIL_USER`/`GMAIL_APP_PASSWORD` — falls back to console log if unset), `CLIENT_URL` (CORS, comma-separated), and Instagram Graph API keys. Frontend needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (empty in prod → relative calls), and Supabase client keys.

## Integrations
- **Gmail SMTP** via nodemailer (`services/contact.service.js`) for the public contact form.
- **Instagram Graph API** (`services/instagram.service.js`) via OAuth for creator metrics.
</content>
