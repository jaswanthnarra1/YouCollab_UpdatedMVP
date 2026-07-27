# You Collab — PRD Implementation Audit

**Auditor role:** Senior Staff Engineer, production-readiness review
**Date:** 2026-07-27
**Scope:** Full stack — Frontend, Backend, DB schema, routes, auth, middleware, services, state, env config
**Method:** Every claim below is backed by a file:line citation. Anything without code evidence is marked NOT IMPLEMENTED.

> **Context for the reader:** only PRD **Priority 1** was implemented in the previous session. Priorities 2–5 were explicitly deferred pending decisions. This audit does not treat "deferred" as "done" — deferred work is marked ❌ below.

---

# 1. Authentication — Clerk Phone OTP

Status: ❌ **Not Implemented**

Evidence:
- `Frontend/src/features/auth/AuthPage.tsx:106` — login uses `signIn.create({ identifier: email, password })`
- `Frontend/src/features/auth/AuthPage.tsx:119-124` — signup uses `signUp.create({ emailAddress, password })` then `prepareEmailAddressVerification({ strategy: "email_code" })`
- `Frontend/src/features/auth/AuthPage.tsx:59-85` — `continueWithGoogle()` with `strategy: "oauth_google"` still present
- `Frontend/src/features/auth/AuthPage.tsx:197-210` — "Continue with Google" button still rendered
- `Frontend/src/features/auth/AuthPage.tsx:234-265` — email + password fields still rendered

What Works:
Nothing toward this requirement. Clerk itself is correctly integrated (`@clerk/express` in `Backend/package.json:14`, `@clerk/clerk-react` in `Frontend/package.json:19`), and `Backend/src/middleware/auth.js:10-24` correctly validates Clerk sessions server-side — but the **strategy is email/password + Google OAuth, not phone OTP**.

Missing Pieces:
- Phone number input field — does not exist
- `preparePhoneNumberVerification` / `attemptPhoneNumberVerification` — zero occurrences in codebase
- Clerk dashboard phone strategy enablement (external config, unverifiable from code)
- Removal of Google button
- Removal of email/password fields
- `users.phone_number` column — does not exist in any migration

Problems Found:
- `Frontend/src/features/auth/VerifyOtpPage.tsx` is hardwired to **email** codes, not SMS
- `SsoCallback.tsx` / `OAuthRole.tsx` exist purely to service the Google redirect leg; they become dead code once Google is removed
- No migration path defined for existing email/Google users → **they would be locked out** on cutover

Recommendation:
1. Enable Phone strategy, disable Email/Password + Google in the **Clerk dashboard** (external, cannot be done in code)
2. Rewrite `AuthPage.tsx:87-139` `submit()` to use `signIn.create({ strategy: "phone_code", identifier: phone })`
3. Delete `continueWithGoogle()` (lines 59-85) and the button (197-210)
4. Repurpose `VerifyOtpPage.tsx` for `attemptFirstFactor({ strategy: "phone_code", code })`
5. Add `phone_number` to `users` in `Backend/supabase/migrations/schema.sql`
6. **Decide the existing-user migration policy before cutover** — this is a business decision, not an engineering one

---

# 2. Authentication — Existing User Migration

Status: 🟡 **Partially Implemented** (incidentally, not deliberately)

Evidence:
- `Backend/src/services/auth.service.js:34-112` — `findOrCreateByClerkId()` keys on `users.clerk_user_id`, falling back to email match to link pre-existing profiles
- `Backend/supabase/migrations/schema.sql:229-258` — `users.clerk_user_id` UNIQUE column, `passwordHash` made nullable

What Works:
Because the join key is `clerk_user_id` (not email), switching Clerk strategies would **not orphan profiles or create duplicate rows** — the linking logic is strategy-agnostic. This satisfies the PRD's "do not create duplicate accounts or orphan existing profiles" requirement structurally.

Missing Pieces:
- No phone-number backfill for existing users
- No in-app "add your phone number" prompt
- No grace period, dual-strategy window, or user communication path

Problems Found:
- Email-based linking (`findOrCreateByClerkId`) **breaks entirely under phone-only auth** — a phone signup carries no email, so the fallback match cannot fire. Existing users would get **brand-new empty profiles** rather than their existing ones. This is the single largest migration risk and is currently unhandled.

Recommendation:
Add a phone-number collection step for existing users **before** disabling email auth, and extend `findOrCreateByClerkId` to match on `phone_number` as a third linking key.

---

# 3. Authentication — Role Onboarding & Dashboard Redirects

Status: ✅ **Fully Implemented** (pre-existing)

Evidence:
- `Frontend/src/features/auth/AuthPage.tsx:113-116` — redirects to `/onboarding/{brand,influencer}` when `!isOnboarded`, else `/dashboard/{brand,influencer}`
- `Frontend/src/routes/App.tsx:77-89` — `RoleRoute` guards with `allowUnonboarded` on onboarding routes
- `Backend/src/services/auth.service.js:34-112` — creates `brands`/`influencers` profile row from `unsafeMetadata.role`
- `Frontend/src/features/auth/OAuthRole.tsx` — role resolution for redirect-based signups

What Works:
New vs. existing user determination, role selection, and role-correct dashboard redirects all work today and are strategy-independent — this logic survives a phone-auth migration unchanged.

Missing Pieces: None.

Problems Found: None blocking.

Recommendation: No change required.

---

# 4. Application Accept / Reject Confirmation

Status: ✅ **Fully Implemented**

Evidence:
- `Frontend/src/components/common/alert-dialog.tsx` — **new**, Radix AlertDialog wrapper
- `Frontend/src/components/common/confirm-dialog.tsx` — **new**, shared `ConfirmDialog`
- `Frontend/src/features/applications/GigApplicants.tsx:144-175` — Accept + Reject wrapped in `ConfirmDialog`
- `Frontend/src/features/dashboard/BrandDashboard.tsx:787-803` — Reject wrapped in `ConfirmDialog`
- `Frontend/src/features/dashboard/BrandDashboard.tsx:146-172` — Approve flow already had a confirm dialog (pre-existing)
- `Frontend/src/test/confirm-dialog.test.tsx` — 3 passing tests

What Works:
Exact PRD copy is used ("Accept this applicant?" / "Reject this applicant?", actions Cancel / Confirm Accept / Confirm Reject). The mutation does **not** fire until confirm is clicked — proven by test `does not run the action until the user confirms`. Cancel is a verified no-op.

Missing Pieces:
- Not verified in a live browser session (blocked: no test credentials, and I do not enter passwords)

Problems Found:
- **Shared `isPending` across rows**: `updateStatus.isPending` (`GigApplicants.tsx:146,153`) is a single mutation object shared by all applicant cards, so acting on one applicant disables the buttons on **every** card. Cosmetic, pre-existing, not introduced here.

Recommendation:
Live-verify the dialog flow. Optionally scope pending state per-application via `variables.aid`.

---

# 5. Black / Blank Screen Bug

Status: 🟡 **Partially Implemented** — mitigated at root cause, but the original defect was never reproduced

Evidence:
- `Frontend/src/components/layout/ErrorBoundary.tsx` — **new** class component with `getDerivedStateFromError` + `componentDidCatch`
- `Frontend/src/routes/App.tsx:62-64,123-124` — wraps the entire `<Routes>` tree
- `Frontend/src/test/confirm-dialog.test.tsx` — test proves a throwing child renders the recovery UI, not a blank page
- `Backend/src/services/application.service.js:203-308` — `updateStatus` is already correctly guarded (ownership check, atomic `status === 'PENDING'` gate)

What Works:
Previously there was **no ErrorBoundary anywhere** in the app — any render-time throw unmounted the whole tree to a white/black screen with no recovery. That class of failure is now caught app-wide with a "Try again" / "Go home" recovery state.

Missing Pieces:
- **The original bug was never reproduced.** I inferred the cause from the missing boundary; I did not observe the blank screen, so I cannot prove this specific report is fixed.

Problems Found:
- If the true cause was something else — a Clerk session expiry mid-mutation, a route-level redirect, a CSS/z-index overlay — the ErrorBoundary would not catch it and the symptom would persist.

Recommendation:
Reproduce the original reject-blank-screen on a real account. If it still occurs, capture the console trace — the boundary will now surface the error instead of swallowing it into a blank page, which is precisely the diagnostic that was missing before.

---

# 6. Logout Confirmation

Status: ✅ **Fully Implemented**

Evidence:
- `Frontend/src/components/layout/Navbar.tsx:48-60` — `ConfirmDialog` wrapping logout
- `Frontend/src/components/layout/Sidebar.tsx:30-36` — shared `logoutConfirmProps`
- `Frontend/src/components/layout/Sidebar.tsx:201-228` — applied to **both** expanded and collapsed logout buttons
- Session cleanup: `Navbar.tsx:13-20` — `await signOut()` (Clerk) → `logout()` (Zustand) → `navigate("/")`

What Works:
Exact PRD copy ("Log out of You Collab?" / "Are you sure you want to log out?", actions Cancel / Log Out). Session cleanup clears both the Clerk session and the persisted Zustand store (`localStorage` key `yc.auth`), then redirects to the public landing page. The `try/finally` in `handleLogout` guarantees local state is cleared **even if Clerk's `signOut()` throws** — no half-logged-out state.

Missing Pieces:
- Not live-verified in browser

Problems Found: None.

Recommendation: Live-verify.

---

# 7. Profile Picture Cropping

Status: ✅ **Fully Implemented** (pending live verification)

Evidence:
- `Frontend/package.json` — `react-easy-crop` added
- `Frontend/src/components/common/avatar-crop-dialog.tsx` — **new** shared component
- `Frontend/src/features/dashboard/InfluencerProfile.tsx:68-97` — `handleImageSelect` → crop dialog → `handleCropped` uploads the blob
- `Frontend/src/features/dashboard/BrandProfile.tsx:68-97` — same pattern
- Backend unchanged: `Backend/src/services/upload.service.js:22-63` accepts the cropped blob as a normal multipart file

What Works:
Full PRD flow: select → crop UI opens → reposition + zoom (slider, and pinch-zoom on mobile via the library) → confirm → cropped JPEG blob uploaded. Square aspect (`aspect={1}`) with `cropShape="round"` matching circular avatar display. Responsive by construction.
Coverage is complete: a codebase-wide grep for `type="file"` returns **only these two** components — there are no other avatar upload sites (onboarding flows do not upload images).

Missing Pieces:
- No explicit separate "preview" step — the live crop viewport *is* the preview. Defensible reading of the PRD, but flag it if a distinct confirm-preview screen was intended.
- Not live-verified

Problems Found:
- `cropToBlob` (`avatar-crop-dialog.tsx:12-30`) outputs at **source-crop resolution** with no max-dimension clamp. A 12MP phone photo cropped loosely can exceed the 5 MB Supabase Storage limit (`Backend/src/services/storage.js:40-78`) and fail at upload. **Real edge case on mobile.**
- `handleCropped` has no `catch` — if `toBlob` fails, `uploading` resets via `finally` but no error toast fires.

Recommendation:
Clamp output to ~512×512 in `cropToBlob` (one line: draw to a fixed-size canvas). Add a `catch` with an error toast.

---

# 8. Gig Lifecycle — publishedAt / expiresAt / Expiration

Status: ❌ **Not Implemented**

Evidence (all negative, verified by grep across both migration files):
- `publishedAt` / `published_at` — **0 occurrences** in `migration.sql` and `schema.sql`
- `expiresAt` / `expires_at` on gigs — **0 occurrences** (the one `expiresAt` at `migration.sql:76` belongs to the unrelated, now-unused `refresh_tokens` table)
- `EXPIRED` — **0 occurrences** in either schema file
- `Backend/supabase/migrations/migration.sql:44-59` — `gigs` table has no lifecycle columns
- `Backend/src/services/gig.service.js:67,373,468` — status is binary `'OPEN'` / `'CLOSED'` only
- No cron/scheduler: `setInterval` / `cron` — **0 occurrences** in `Backend/src`; no `node-cron` in `Backend/package.json`

What Works:
Nothing toward gig expiry. `Backend/src/services/application.service.js:39-41` blocks applications when `gig.status !== 'OPEN'`, which is the *manual* close path only.

Missing Pieces:
- `publishedAt`, `expiresAt`, configurable validity duration (PRD: 14 days default)
- `DRAFT` / `ACTIVE` / `EXPIRED` statuses
- Automatic expiration mechanism
- Server-side expiry enforcement on apply
- Exclusion of expired gigs from discovery
- "Applications closed" UI state

Problems Found:
- **Schema/validation mismatch (latent bug):** `Backend/src/models/gig.schema.js:30` accepts `status: z.enum(['OPEN','CLOSED','DRAFT'])`, but no service ever writes `DRAFT` and no UI or query handles it. A client can POST `status: "DRAFT"` and create a gig in a state the entire application is blind to — it would be invisible to `list_gigs_in_radius` filters expecting OPEN yet still directly reachable by ID.

Recommendation:
1. Migration in `schema.sql`: add `publishedAt`, `expiresAt`, extend status constraint, backfill `'OPEN'`→`'ACTIVE'`
2. Config constant for validity duration (not hardcoded per-row)
3. Add `expiresAt > now()` predicate to discovery queries **and** to `application.service.js:apply()`
4. Either remove `DRAFT` from the Zod enum or implement it fully — do not leave it half-accepted

---

# 9. Pricing System — Free / Starter / Growth

Status: ❌ **Not Implemented**

Evidence (negative, verified):
- `plan` — **0 occurrences** in `migration.sql` / `schema.sql`
- `subscription` — **0 occurrences**
- `campaignLimit` — **0 occurrences**
- `Backend/src/api/index.js:15-24` — no plans/subscription/billing route mounted
- No `plan.service.js` in `Backend/src/services/`
- No pricing UI anywhere in `Frontend/src`

What Works:
Nothing. The nearest adjacent primitive is the **unrelated** trial-credits system (`schema.sql:47-81`, `Backend/src/utils/credits.js`) which gates *hiring cost*, not campaign or slot counts — different concern, not a partial implementation of this one.

Missing Pieces: Everything — `plans` table, seed rows (Free / Starter ₹99 / Growth), `brands.plan_id`, campaign-limit enforcement, plan config API, pricing UI.

Problems Found: N/A (nothing to have bugs).

Recommendation:
Create `plans` table + `Backend/src/services/plan.service.js`; enforce `campaign_limit` in `gig.service.js:create` before insert. Keep plan assignment admin-set for now — the PRD explicitly defers payment integration.

---

# 10. Application Slot System

Status: 🟡 **Partially Implemented** — only duplicate prevention exists

Evidence:
- ✅ **Duplicate prevention (two layers):**
  - `Backend/supabase/migrations/migration.sql:68` — `UNIQUE("gigId", "influencerId")` DB constraint
  - `Backend/src/services/application.service.js:43-52` — explicit pre-check returning HTTP 409
- ❌ `applicationSlots` / `application_slots` — **0 occurrences** in either schema file
- ❌ No slot allocation, capacity check, or remaining-slots UI anywhere

What Works:
Duplicate applications are correctly prevented, and correctly enforced **at the database level** — not merely in application code — so it holds even under a race between two concurrent requests. This satisfies exactly one line of the PRD's slot requirements.

Missing Pieces:
- `gigs.application_slots` column
- Allocation editor UI
- `SUM(slots) ≤ plan limit` constraint
- `≥ 1 slot per active campaign` invariant
- Capacity check on apply + "This collaboration has reached its application limit." message
- "8 / 16 Applications — 8 slots remaining" readout

Problems Found:
- Without a capacity gate, `apply()` (`application.service.js:25-85`) accepts **unbounded** applications per gig. This is the monetization mechanism, so it is a revenue gap, not just a feature gap.

Recommendation:
Add `application_slots` to `gigs`; enforce the sum/minimum invariants via a Postgres trigger or atomic RPC (mirroring the existing `debit_brand_credits` pattern in `schema.sql`) rather than in JS alone — application-level checks race under concurrency, exactly as the duplicate check would have without its DB constraint.

---

# 11. Instagram / Meta Integration

Status: 🟡 **Partially Implemented**

Evidence:
- ✅ `Backend/src/services/instagram.service.js:116-125` — `getOAuthUrl()`, official Meta OAuth
- ✅ `:134-164` — `exchangeCodeForToken` → `getLongLivedToken` (60-day)
- ✅ `:301-344` — `connectInstagram()` stores `igUserId`, `igUsername`, `igFollowersCount`, `igProfilePicUrl`, `igLastSyncAt`
- ✅ `:217-291` — `syncInfluencerIgData()`, proactively refreshes tokens expiring within 7 days
- ✅ `Backend/src/api/instagram.routes.js:21` — all endpoints behind `authenticate, requireRole('INFLUENCER')`
- ✅ `instagram.service.js:388` — the profile SELECT list **excludes `igAccessToken`** — token never leaves the backend
- ❌ No scheduler: `setInterval`/`cron` — **0 occurrences** in `Backend/src`
- ❌ `lastSyncAt` — **0 occurrences** in `Frontend/src`

What Works:
Genuine OAuth against official Meta APIs (no scraping), backend-only token custody, follower/media metrics stored, and `igLastSyncAt` recorded and returned by `instagram.controller.js:89,117`.

Missing Pieces:
- **Periodic 24-hour sync** — sync is manual-only via `POST /api/instagram/sync`
- **"Updated 2 days ago" display** — `igLastSyncAt` reaches the frontend but is never rendered
- Follower count is still manually editable (`InfluencerProfile.tsx:28` `followerCount`) even when IG is connected, contradicting the PRD's "connected account is the source of truth"

Problems Found:
- 🔴 **Deployment-breaking:** all `ig*` columns are defined **only** in `Backend/supabase/migrations/instagram_migration.sql`, which `Backend/supabase/migrate.js:110-114` **does not run** — it applies only `migration.sql` and `schema.sql`. On a fresh database, `npm run db:migrate` produces an `influencers` table with **no Instagram columns**, and every Instagram feature fails at runtime. This works in the current environment only because the file was applied manually at some point.

Recommendation:
1. **Fold `instagram_migration.sql` into `schema.sql`** — highest priority item in this audit; it is silent until a fresh deploy
2. Add the 24h sync sweep (reuse whatever scheduler is chosen for gig expiry — do not build two)
3. Render `lastSyncAt` on the creator profile
4. Make `followerCount` read-only when `isIgVerified`

---

# 12. Google Maps / Places / Geocoding

Status: 🟡 **Partially Implemented** — distance math exists, Google integration does not

Evidence:
- ✅ `Backend/supabase/migrations/schema.sql:271-317` — `pincodes` lookup table
- ✅ `:321-330` — `latitude`/`longitude`/`pincode` on both `brands` and `influencers`
- ✅ `:334-344` — `gigs.radiusKm` constrained to `NULL,2,5,10,20`
- ✅ `:349-480` — `haversine_km()` + `list_gigs_in_radius()` RPC, server-side radius filtering
- ✅ `Backend/src/services/geo.service.js:32-40` — JS `haversineKm` mirror
- ❌ `googlemaps` / `places` / `GOOGLE_MAPS` — **0 occurrences** in `Backend/src` or `Backend/.env.example`
- ❌ No maps dependency in either `package.json`

What Works:
Radius-based **discovery** genuinely works server-side via the Postgres RPC, and distance is computed correctly (great-circle, not naive Euclidean).

Missing Pieces:
- Google Places Autocomplete for brand gig-location selection
- Google Geocoding API
- `GOOGLE_MAPS_API_KEY` env var
- Brand-side location picker UI (`GigCreate.tsx` has no location search)

Problems Found:
- `geo.service.js:21` hard-fails with *"We currently support Pune PIN codes only"* for any non-Pune PIN. The `pincodes` table is scoped to `411xxx`, so the product **cannot geographically expand** without either a real geocoding API or manual per-city table maintenance.
- `gigs` has `radiusKm` but **no `latitude`/`longitude` of its own** — radius is measured from the *brand's* location, not a per-gig location. The PRD explicitly asks brands to set a **gig** location ("a café in Koregaon Park"), which a multi-location brand cannot express today.

Recommendation:
Add `gigs.latitude`/`longitude`; proxy Places/Geocoding through a new `Backend/src/api/geo.routes.js` so the API key stays server-side (mirroring the Instagram pattern); fall back to the static `pincodes` table first and call Google only on miss, caching the result back.

---

# 13. Location Matching Logic (Radius Enforcement on Apply)

Status: ❌ **Not Implemented** — this is a **security-relevant** gap

Evidence:
- `Backend/src/services/application.service.js:25-85` — the complete `apply()` function. It checks: gig exists (`:34`), gig is OPEN (`:39`), duplicate (`:43`). **It performs no distance or radius check whatsoever.**
- Grep for `radiusKm|haversineKm` across the backend returns hits **only** in `gig.service.js` (create/update/read) and `application.service.js:155` (display-only distance for the brand's applicant list) — **never in the apply path**

What Works:
Radius filtering is applied to *discovery* (`list_gigs_in_radius`), so out-of-radius gigs are hidden in the normal UI.

Missing Pieces:
- The entire eligibility check
- The PRD's required message: "This collaboration is currently available only to Creators within [X] km of the Brand's location."

Problems Found:
- 🔴 **The PRD requirement "The eligibility check must happen on the backend. Do not rely only on frontend validation" is violated.** Enforcement today is *discovery-only* — a creator 50 km away who obtains a gig ID (shared link, browser history, or a direct `POST /api/applications` with any gig UUID) **will have their application accepted**. Hiding a gig in the feed is not an authorization control.

Recommendation:
In `application.service.js:apply()`, immediately after the status check (`:41`), load the brand's coordinates alongside the gig, and when `gig.radiusKm` is set, compute `haversineKm(...)` and throw `AppError(...)` with the PRD message if it exceeds the radius. This is a ~10-line change and closes the hole.

---

# 14. Location Privacy

Status: ✅ **Fully Implemented**

Evidence:
- `Backend/src/services/application.service.js:150-158` — destructures `latitude`/`longitude` **off** the influencer object and returns only a rounded `distanceKm`; the comment at `:148` states the intent explicitly
- `Backend/src/services/geo.service.js:39` — distance rounded to nearest 0.5 km
- Onboarding collects **only PIN code + city** — no street address field exists anywhere (`InfluencerProfile.tsx:25` `pincode` only)

What Works:
Exact creator coordinates never reach the client. Rounding to 0.5 km additionally blunts trilateration — a genuinely thoughtful privacy control, not just field omission. No exact address is collected in the first place, so it cannot leak.

Missing Pieces: None.

Problems Found:
- Minor: PIN-code-level coordinates come from the shared `pincodes` table, so all creators in one PIN code share identical coordinates. This is privacy-*positive* (k-anonymity), worth keeping.

Recommendation: No change. Preserve this behavior when adding the §13 radius check — compute distance **server-side** and never return raw coordinates.

---

# 15. UX — Loading / Error / Success / Empty States

Status: 🟡 **Partially Implemented**

Evidence:
- ✅ Loading: `GigApplicants.tsx:89` ("Loading applicants…"), `InfluencerProfile.tsx:94-102` (spinner), `:127` (upload spinner)
- ✅ Empty: `GigApplicants.tsx:91` ("No applicants yet.")
- ✅ Success: `GigApplicants.tsx:73` toast, `InfluencerProfile.tsx:58` toast
- ✅ Error: `GigApplicants.tsx:75-80` — **improved this session** to surface the server message instead of a bare "Update failed"
- ✅ Global: `ErrorBoundary.tsx` — new app-wide catch
- ✅ Confirmation dialogs — see §4, §6

What Works:
The four states are consistently present across the surfaces touched, and the global ErrorBoundary satisfies the PRD's "should never display a blank or black screen due to a failed API request."

Missing Pieces:
- No route-level error state for failed **queries** (as opposed to mutations) — e.g. if `useQuery(["gig", id])` fails in `GigApplicants.tsx:63`, `gig` is `undefined` and the header silently renders the fallback string `"Gig"` rather than an error state
- States for the not-yet-built features (§8–§10) obviously absent

Problems Found:
- `GigApplicants.tsx:63` destructures only `data` from the gig query — `isError` is ignored, so a failed gig fetch renders a misleading half-populated page.

Recommendation:
Handle `isError` on the primary queries in `GigApplicants.tsx` and the dashboards.

---

# 16. Security

Status: ✅ **Fully Implemented** for current scope

Evidence:
- ✅ `Backend/src/services/instagram.service.js:388` — `igAccessToken` excluded from the profile SELECT
- ✅ `Backend/.env.example` — `INSTAGRAM_APP_SECRET`, `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RECAPTCHA_SECRET_KEY` all backend-only
- ✅ `Frontend/.env.example` — contains only publishable/anon keys (`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- ✅ `Backend/src/middleware/auth.js:10-24` — `authenticate` validates the Clerk session server-side; `requireRole()` guards by role
- ✅ `Backend/src/api/instagram.routes.js:21` — router-level `authenticate, requireRole('INFLUENCER')`
- ✅ `Backend/src/services/application.service.js:98-113` — ownership check (403) before returning applicants
- ✅ `:203-308` — `updateStatus` verifies brand ownership and gates on `status === 'PENDING'` atomically
- ✅ `Backend/src/index.js:49` — CORS origin allow-list enforced (observed rejecting a disallowed origin during testing)

What Works:
No secret material is exposed to the client. Authorization is enforced per-request at the service layer, not merely by hiding UI. `helmet` is in the middleware chain.

Missing Pieces:
- No rate limiting observed on `POST /api/applications`
- The §13 radius gap is an authorization gap (listed there, not double-counted here)

Problems Found:
- **Dead config:** `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` remain in `Backend/.env.example` and `config/index.js` (which still **throws on startup** if `JWT_SECRET` is unset in production) despite app-issued JWTs being fully replaced by Clerk. The `refresh_tokens` table (`migration.sql:72-78`) is likewise orphaned. This is confusing at best and a deployment trap at worst.

Recommendation:
Remove the JWT config + `refresh_tokens` table; add rate limiting to the apply endpoint.

---

# 17. Database — Field Verification

Status: 🟡 **Partially Implemented**

| PRD field | Table | Status | Evidence |
|---|---|---|---|
| `clerk_user_id` | users | ✅ | `schema.sql:229-258` |
| `phone_number` | users | ❌ | 0 occurrences |
| `pincode`, `latitude`, `longitude` | influencers | ✅ | `schema.sql:321-330` |
| IG connection fields | influencers | 🟡 | **only in unrun `instagram_migration.sql`** |
| `pincode`, `latitude`, `longitude` | brands | ✅ | `schema.sql:321-330` |
| `radiusKm` | gigs | ✅ | `schema.sql:334-344` |
| `latitude`, `longitude` | gigs | ❌ | 0 occurrences — radius measured from brand |
| `publishedAt`, `expiresAt` | gigs | ❌ | 0 occurrences |
| `status` (DRAFT/ACTIVE/EXPIRED/CLOSED) | gigs | ❌ | only OPEN/CLOSED (`gig.service.js:67,468`) |
| `applicationLimit` / slots | gigs | ❌ | 0 occurrences |
| Application `id/gigId/creatorId/status` | applications | ✅ | `migration.sql:62-69` |
| Unique (gigId, influencerId) | applications | ✅ | `migration.sql:68` |
| `plans` table | — | ❌ | does not exist |
| Brand plan usage tracking | — | ❌ | does not exist |

Recommendation: Consolidate all of the above into `schema.sql`, since that is the only enhancement file `migrate.js` actually applies.

---

# 18. APIs — Endpoint Verification

Status: 🟡 **Partially Implemented**

Existing (`Backend/src/api/index.js:15-24`): `/auth`, `/onboarding`, `/gigs`, `/applications`, `/notifications`, `/upload`, `/instagram`, `/profile`, `/recaptcha`, `/contact`, `/health`

| PRD-required endpoint | Status |
|---|---|
| Auth (Clerk-mediated) | ✅ `/api/auth/me`, `/account`, `/preferences` |
| Gig CRUD | ✅ `/api/gigs` |
| Applications + status update | ✅ `/api/applications`, `PATCH /:id/status` |
| Instagram OAuth + sync | ✅ `/api/instagram/*` |
| Upload | ✅ `/api/upload` |
| Plans / subscription | ❌ not mounted |
| Slot allocation | ❌ not mounted |
| Geocoding / Places proxy | ❌ not mounted |
| Gig expiry / status transition | ❌ not mounted |

---

# FINAL SUMMARY

# Overall Completion

**Completion Percentage: 38 / 100**

Method: 24 PRD "Definition of Done" items — 9 fully met, 5 partial, 10 missing (≈48% unweighted). Weighted by remaining engineering effort (pricing, slots, gig lifecycle, phone auth and Maps are the largest blocks and are ~untouched), the honest figure is **≈38%**. Note that several ✅ items (duplicate prevention, location privacy, Instagram OAuth, role onboarding) were **already implemented before this PRD** — newly delivered work this session is Priority 1 only.

Fully Completed Features:
- Accept / Reject confirmation dialogs
- Logout confirmation + session cleanup
- Profile picture cropping (zoom, square, responsive)
- Duplicate application prevention (DB-level)
- Location privacy (coordinates never exposed)
- Role onboarding + dashboard redirects
- Security posture: no secrets client-side, backend authorization
- Instagram OAuth + backend-only token custody

Partially Completed Features:
- Blank-screen fix (mitigated app-wide; original defect never reproduced)
- Existing-user migration (structurally safe, but breaks under phone-only auth)
- Instagram integration (no 24h sync, no "last updated" UI, **migration file not wired**)
- Google Maps (haversine + radius discovery yes; Places/Geocoding/gig-location no)
- Application slots (duplicate prevention only)
- UX states (mutation errors handled; query errors not)

Missing Features:
- Clerk **Phone OTP** authentication
- Removal of Google login / Email OTP
- Gig lifecycle: `publishedAt`, `expiresAt`, `EXPIRED`, auto-expiration
- Pricing system: Free / Starter / Growth, campaign limits
- Application slot allocation, capacity enforcement, remaining-slots UI
- **Radius eligibility enforcement on apply**
- Google Places / Geocoding integration
- Brand gig-location picker

Critical Bugs:
1. 🔴 **Instagram columns never reach a fresh DB** — `instagram_migration.sql` is not run by `migrate.js:110-114`. Silent until a clean deploy, then every IG feature breaks.
2. 🔴 **Radius bypass** — `application.service.js:apply()` has no distance check; out-of-radius creators can apply via direct API call. Violates an explicit PRD requirement.
3. 🟠 **`DRAFT` status accepted but unhandled** — `gig.schema.js:30` permits a state no query or UI understands.
4. 🟠 **Crop output unbounded** — large phone photos can exceed the 5 MB storage limit post-crop.

Database Issues:
- `instagram_migration.sql` + 7 timestamped Lovable migrations are unwired from `migrate.js`
- Orphaned `refresh_tokens` table (dead post-Clerk)
- No `gigs.latitude/longitude` — cannot express per-gig location
- `pincodes` hardcoded to Pune `411xxx`

Frontend Issues:
- `GigApplicants.tsx:63` ignores query `isError` → misleading half-rendered page
- Shared `isPending` disables action buttons across all applicant rows
- `igLastSyncAt` reaches the client but is never displayed
- Manual `followerCount` editable even when Instagram is connected

Backend Issues:
- No scheduler of any kind (blocks both gig expiry and 24h IG sync)
- No rate limiting on the apply endpoint
- Dead JWT config still **throws on production startup** if `JWT_SECRET` is unset

Security Issues:
- Radius enforcement is discovery-only, not authorization (see Critical #2)
- No rate limiting on application submission
- *No secret exposure found* — env separation and token custody are correct

Performance Concerns:
- `list_gigs_in_radius` computes haversine across all gigs without a spatial index (fine at Pune scale; will degrade past ~10k gigs — PostGIS or a bounding-box prefilter later)
- `BrandDashboard.tsx` refetches all applications on every status change
- Crop canvas work is main-thread (acceptable for one image)

Technical Debt:
- `CLAUDE.md` still documents the **pre-Clerk** OTP/JWT auth flow — actively misleading
- Dead files if Google auth is removed: `SsoCallback.tsx`, `OAuthRole.tsx`
- Two dialog primitives now coexist (`common/dialog.tsx`, `common/alert-dialog.tsx`) — intended, but keep them from diverging
- 7 unwired timestamped migration files

---

# Requirement Checklist

## Authentication
- ❌ Clerk Phone OTP
- ❌ Removal of Google login
- ❌ Removal of Email OTP
- 🟡 Existing user migration
- ✅ Role onboarding
- ✅ Dashboard redirects

## Application Management
- ✅ Accept confirmation dialog
- ✅ Reject confirmation dialog
- 🟡 Black screen bug fixed
- ✅ Success/Error handling
- ✅ UI refresh without reload

## Logout
- ✅ Confirmation dialog
- ✅ Redirect
- ✅ Session cleanup

## Profile Picture
- ✅ Cropper implemented
- ✅ Preview (live crop viewport)
- ✅ Zoom
- ✅ Responsive
- ✅ Cropped image stored

## Gig Lifecycle
- ❌ publishedAt
- ❌ expiresAt
- ❌ status (DRAFT/ACTIVE/EXPIRED)
- ❌ automatic expiration
- ❌ server-side expiry
- ❌ expired gigs hidden
- ❌ applications blocked

## Pricing System
- ❌ Free plan
- ❌ Starter plan
- ❌ Growth plan
- ❌ configurable plans
- ❌ campaign limits

## Application Slot System
- ❌ allocation
- ❌ remaining slots
- ❌ minimum one slot per campaign
- ✅ duplicate prevention
- ❌ backend enforcement

## Instagram Integration
- ✅ OAuth
- ✅ Meta API
- 🟡 follower sync (manual only)
- 🟡 last synced timestamp (stored, not displayed)
- ✅ backend token handling

## Google Maps
- ❌ Places API
- 🟡 geocoding (static table, Pune-only)
- ✅ coordinates
- ✅ radius
- ❌ backend distance validation **on apply**

## Location Privacy
- ✅ exact address hidden
- ✅ only city shown
- ✅ secure storage

## UX
- ✅ Loading states
- 🟡 Error states
- ✅ Success states
- ✅ Empty states
- ✅ Confirmation dialogs

## Security
- ✅ API keys hidden
- ✅ Tokens never exposed
- 🟡 Backend validation
- ✅ Authorization

---

# Exact Changes Required to Reach 100%

**Tier 0 — fix now, independent of roadmap (~1 hour)**
1. `Backend/supabase/migrations/schema.sql` — append the contents of `instagram_migration.sql`
2. `Backend/src/services/application.service.js` after line 41 — add the radius eligibility check
3. `Backend/src/models/gig.schema.js:30` — remove `'DRAFT'` until implemented
4. `Frontend/src/components/common/avatar-crop-dialog.tsx:12-30` — clamp output to 512×512, add `catch`
5. `Frontend/src/features/applications/GigApplicants.tsx:63` — handle `isError`
6. `CLAUDE.md` — correct the stale pre-Clerk auth documentation

**Tier 1 — Gig lifecycle**
7. `schema.sql` — `publishedAt`, `expiresAt`, extended status constraint + backfill
8. `Backend/src/config/index.js` — `GIG_VALIDITY_DAYS = 14`
9. `gig.service.js` — set timestamps on publish; add expiry predicate to all discovery queries
10. `application.service.js:apply()` — reject expired gigs
11. `Frontend/src/features/gigs/GigDetail.tsx` — "Applications closed" state

**Tier 2 — Pricing & slots**
12. `schema.sql` — `plans` table + seed; `brands.plan_id`; `gigs.application_slots`
13. `schema.sql` — trigger/RPC enforcing `SUM(slots) ≤ limit` and `slots ≥ 1`
14. New `Backend/src/services/plan.service.js` + `Backend/src/api/plan.routes.js`
15. `gig.service.js:create` — enforce campaign limit
16. `application.service.js:apply()` — capacity check + PRD message
17. Frontend: slot allocation editor + "8 / 16 Applications" readout

**Tier 3 — Location**
18. `schema.sql` — `gigs.latitude`/`longitude`
19. New `Backend/src/api/geo.routes.js` — server-side Places/Geocoding proxy
20. `geo.service.js` — Google Geocoding fallback on `pincodes` miss, cache back
21. `Frontend/src/features/gigs/GigCreate.tsx` / `GigEdit.tsx` — location picker

**Tier 4 — Auth (gate on business decisions)**
22. Clerk dashboard — enable Phone, disable Email/Password + Google
23. `AuthPage.tsx:59-85,87-139,197-210,234-279` — phone OTP rewrite
24. `VerifyOtpPage.tsx` — phone code verification
25. `schema.sql` — `users.phone_number`; extend `findOrCreateByClerkId` to link on phone
26. Delete `SsoCallback.tsx`, `OAuthRole.tsx`; remove dead JWT config + `refresh_tokens`

**Tier 5 — Scheduling (one mechanism, two consumers)**
27. Add a scheduler; wire gig expiry sweep + 24h Instagram sync
28. Render `lastSyncAt` on the creator profile; make `followerCount` read-only when IG-verified
