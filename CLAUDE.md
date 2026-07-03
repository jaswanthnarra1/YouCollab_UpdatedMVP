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

Backend has **no test/lint scripts** — only `dev` and `start`. Verify backend changes by booting it and hitting endpoints (e.g. `curl localhost:5000/api/health`, or `POST /api/auth/login` with a seed account).

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

### Authentication (hybrid — important)
Auth is a deliberate hybrid of Supabase Auth + **app-issued JWTs**:
- Supabase Auth stores credentials and handles email confirmation; the backend calls `supabaseAdmin.auth.admin.*` for user creation/confirmation/password updates.
- The backend issues its **own** access + rotating refresh JWTs (`middleware/auth.js` verifies them; `requireRole('BRAND'|'INFLUENCER')` guards routes). Refresh tokens are bcrypt-hashed in the `refresh_tokens` table and rotated on each refresh.
- Registration is OTP-based: `register` creates an *unconfirmed* Supabase Auth user + stores hashed OTP/signup data in `email_otps`; `verifyOtp` confirms the user, creates the `public.users` row + role profile (`brands`/`influencers`), and issues tokens. In development the OTP is logged and returned as `dev_otp`.
- The Supabase Auth admin API has no "get user by email"; use the `findAuthUserByEmail()` helper in `auth.service.js` (paginates `listUsers`) rather than an unpaginated `listUsers()` call.
- `JWT_SECRET` has a dev-only fallback default; `config/index.js` throws on startup if it's unset when `NODE_ENV=production`.

### Frontend
- Feature-sliced under `src/features/` (auth, dashboard, gigs, applications, marketplace). Routing in `src/routes/App.tsx` with `ProtectedRoute` / `RoleRoute` guards.
- `src/lib/api.ts` — axios client with a request interceptor (attaches bearer token from `localStorage`) and a response interceptor that auto-refreshes on 401 (single-flight, queues concurrent requests) and redirects to `/login` on failure. Use `unwrap()` to strip the `{ data }` envelope.
- State: **TanStack React Query** for server state, **Zustand** (`src/stores/authStore.ts`, persisted to `localStorage` key `yc.auth`) for session. Access token also stored under `yc.accessToken`.
- UI: shadcn/Radix components in `src/components/ui` and `src/components/common`; Tailwind; forms via react-hook-form + Zod. `@` aliases `Frontend/src`.
- **Dev server runs on port 8080** (not Vite's default 5173) — see CORS allow-list in `Backend/src/index.js`.

### Database
Postgres via Supabase. `npm run db:migrate` (`Backend/supabase/migrate.js`) connects with the raw `pg` client using `DATABASE_URL` (the only place `pg` is used — the app runtime uses the Supabase JS client) and applies **only two files**: `migrations/migration.sql` (base schema) then `migrations/schema.sql` (enhancements). The directory also holds several timestamped Supabase/Lovable-style migration files and `instagram_migration.sql` — `migrate.js` does **not** run these; they're not wired into the migrate script, so if you add schema changes, add them to `migration.sql`/`schema.sql` (or apply the timestamped file manually) or they won't reach a fresh database. Tables: `users`, `brands`, `influencers`, `gigs`, `applications`, `notifications`, `refresh_tokens`, `email_otps`. Note: `messages` and `reviews` tables exist in the schema but have **no API/UI** yet (planned features).

## Environment

Two `.env` files are required (templates in `Backend/.env.example`, `Frontend/.env.example`): Backend needs Supabase keys, `JWT_SECRET`, `DATABASE_URL`, Gmail SMTP (`GMAIL_USER`/`GMAIL_APP_PASSWORD` — OTP emails; falls back to console log if unset), `CLIENT_URL` (CORS, comma-separated), and Instagram Graph API keys. Frontend needs `VITE_API_BASE_URL` (empty in prod → relative calls) and Supabase client keys.

## Integrations
- **Gmail SMTP** via nodemailer (`services/email.service.js`) for OTP/reset emails.
- **Instagram Graph API** (`services/instagram.service.js`) via OAuth for creator metrics.
</content>
