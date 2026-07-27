# You Collab — Product Changes Implementation Plan

Source spec: `You_Collab_Product_Changes.docx` (provided 2026-07-27). This plan cross-checks every requirement against the actual codebase before proposing work, per both the spec's own instruction ("inspect the existing codebase first") and this repo's engineering conventions (reuse, no unrequested rewrites, incremental delivery).

## 0. Corrections to the spec's assumptions

The spec was written without visibility into recent commits. Three of its premises don't match current reality — these change scope significantly and should be confirmed with whoever wrote the spec before work starts:

1. **Auth already runs on Clerk.** The spec asks to "replace Google + Email/OTP with Clerk phone auth" as if Clerk isn't integrated yet. It was — `@clerk/express` (backend) and `@clerk/clerk-react` (frontend) were wired in for the whole app in a recent migration (`Backend/src/middleware/auth.js`, `Frontend/src/features/auth/AuthPage.tsx`). There is no app-issued JWT/OTP system left to migrate off of. **The real task is narrower**: swap which Clerk *strategies* are enabled (turn on phone+OTP, turn off email/password and Google), not a ground-up auth rebuild. See §1.
2. **Location matching already has a real backend.** Creator PIN-code → lat/lng geocoding, a `haversine_km` Postgres function, server-side radius filtering (`list_gigs_in_radius` RPC), and a live "nearby" sort on both dashboards already exist and are in production. What's actually missing is (a) the Brand-side gig-creation location *picker* UI, and (b) expanding geocoding beyond the current Pune-only (`411xxx`) static lookup table. This is UI + data-coverage work, not new backend architecture. See §7–8.
3. **Blank-screen-on-reject is a missing-ErrorBoundary bug, not a flow-design problem.** The accept/reject mutation itself (`application.service.js:updateStatus`) is already correctly guarded (atomic status check, no page reload, react-query invalidation only). The likely cause is that the app has **no `ErrorBoundary` anywhere** (`App.tsx`/`main.tsx`), so any render-time exception after a refetch unmounts to a blank page instead of showing an error state. Fixing the root cause (add an ErrorBoundary) benefits every screen, not just this one — consistent with fixing shared functions once rather than patching one call site.

Everything else in the spec (pricing/plan system, Instagram follower sync cadence, profile picture cropping, gig expiry states) is genuinely new and matches the plan below as-is.

## 1. Authentication: phone-only via Clerk

**Current state**: `AuthPage.tsx` offers Clerk email/password + `signUp.authenticateWithRedirect({strategy:"oauth_google"})`; `react-google-recaptcha` gates submission; `SsoCallback.tsx`/`OAuthRole.tsx`/`VerifyOtpPage.tsx` handle the redirect/verification legs. Backend never sees credentials — `authenticate` middleware just trusts Clerk's session and lazily provisions a `users` row via `findOrCreateByClerkId` keyed on `clerk_user_id`.

**Changes**:
- Clerk dashboard: enable **Phone number** as a sign-in/sign-up strategy, disable Email/password and Google OAuth (Clerk instance-level config, not app code).
- `AuthPage.tsx`: replace the email/password + Google form with a phone-number input → Clerk's phone OTP flow (`useSignIn`/`useSignUp` already imported — just the `create`/`prepareVerification`/`attemptVerification` calls change from email-code to phone-code strategy). Delete the Google button and recaptcha gate (recaptcha existed to protect the password field; confirm with the team whether it's still wanted for phone OTP abuse — Clerk has built-in bot protection, so likely removable, but flag rather than silently drop it).
- `findOrCreateByClerkId` (`auth.service.js:34-112`) already branches on `unsafeMetadata.role`; only change needed is ensuring the new/existing-user branch works when Clerk's identifying claim is a phone number instead of email (Clerk's `clerkUserId` is stable regardless of strategy, so this should need **no change** — verify with a manual test, don't assume).
- **Do not delete `users.email`/existing Google/email-linked accounts.** Since `clerk_user_id` is already the join key (not email), existing accounts are unaffected by disabling the strategies in Clerk — they simply can't log in via the old method anymore. Confirm with the team whether existing users need an in-app notice ("we've moved to phone login, add your number") before cutting over, since silently locking out existing users is a support-ticket risk.

**Files**: `Frontend/src/features/auth/AuthPage.tsx`, `SsoCallback.tsx`, `OAuthRole.tsx` (likely deletable if Google is fully removed), `VerifyOtpPage.tsx` (rename/repurpose for phone code). Backend: no changes expected beyond verification testing.

**Open question for the team**: is Google OAuth actually being removed, or kept as a secondary option alongside phone? The spec says "replace," but losing Google entirely removes a lower-friction option for desktop users — worth a deliberate yes/no rather than silently implementing the literal wording.

## 2 & 3. Accept/Reject and Logout confirmation dialogs

**Current state**: no `AlertDialog` component exists in `Frontend/src/components/ui`, but `@radix-ui/react-alert-dialog` is **already an installed dependency** (unused) — this is the standard shadcn primitive, so this is a "generate the shadcn wrapper file" task, not a new-dependency task. The only existing confirm-before-destructive pattern today is bare `window.confirm()` (`InfluencerDashboard.tsx:335`, `BrandDashboard.tsx:269`).

**Changes**:
- Add `Frontend/src/components/ui/alert-dialog.tsx` (standard shadcn generation from the already-installed Radix primitive).
- `Frontend/src/features/applications/GigApplicants.tsx`: wrap the Accept/Reject buttons (145-158) in `AlertDialog` triggers using the exact copy from the spec. On confirm, call the existing `updateStatus` mutation — no change to the mutation itself needed beyond adding an `onError` toast if one isn't already present.
- Root-cause fix for the blank-screen bug: add a React `ErrorBoundary` around the router outlet in `App.tsx`, rendering a friendly "something went wrong" state with a retry button, instead of leaving `<Suspense>` as the only wrapper.
- Logout: replace the three direct `signOut()` call sites (`Navbar.tsx:13-20`, `Sidebar.tsx:14-25`, `Settings.tsx:221`) with the same `AlertDialog` pattern. Since there are three call sites doing the same thing, extract one shared `useLogoutConfirm()` hook or `<LogoutButton>` component rather than duplicating the dialog JSX three times.
- Replace the two `window.confirm()` destructive-action sites (withdraw pitch, delete gig) with the same `AlertDialog` while touching this area, since the spec explicitly lists "Delete Gig" as requiring a proper confirmation dialog too.

**Files**: new `Frontend/src/components/ui/alert-dialog.tsx`; edits to `GigApplicants.tsx`, `Navbar.tsx`, `Sidebar.tsx`, `Settings.tsx`, `InfluencerDashboard.tsx`, `BrandDashboard.tsx`, `App.tsx`.

## 4. Profile picture cropping

**Current state**: raw `<input type="file">` uploads immediately with no preview/crop step (`InfluencerProfile.tsx`, `BrandProfile.tsx`, and both onboarding forms all repeat this pattern). No cropping library is installed. Upload backend (`upload.service.js` → Supabase Storage `avatars` bucket, 5MB limit, jpeg/png/webp/gif) needs no changes — it already accepts a `File`/blob, so a cropped output blob is a drop-in replacement for the raw file.

**Changes**:
- Add `react-easy-crop` (small, no canvas boilerplate, handles pinch-zoom on mobile out of the box — matches the spec's "use an existing library, not a custom engine").
- Build one shared `<AvatarCropDialog>` component (square aspect ratio per spec) that takes a selected `File`, shows the crop UI in an `AlertDialog`/`Dialog`, and returns a cropped `Blob` via canvas `toBlob` on confirm.
- Wire it into the four existing upload call sites (`InfluencerProfile.tsx`, `BrandProfile.tsx`, `InfluencerOnboarding.tsx`, `BrandOnboarding.tsx`) in place of the immediate-upload `handleImageUpload`, so this is one new component reused four times, not four separate implementations.

**Files**: new `Frontend/src/components/common/AvatarCropDialog.tsx`; edits to the four profile/onboarding components; `Frontend/package.json` (+1 dependency).

## 5. Gig validity / expiration

**Current state**: `gigs.status` is a binary `'OPEN'/'CLOSED'` enum (`gig.service.js:67,373,468`), toggled manually by the Brand. No `publishedAt`/`expiresAt` columns, no scheduler/cron mechanism anywhere in the backend.

**Changes**:
- DB migration (append to `schema.sql`, per this repo's convention — `migration.sql`/`schema.sql` are the only files `db:migrate` runs): add `gigs.status` values `DRAFT/ACTIVE/EXPIRED/CLOSED` (extend the existing enum/check constraint, don't replace it — `CLOSED` already means something to existing rows, map old `'OPEN'`→`ACTIVE`, `'CLOSED'`→`CLOSED` in a backfill statement), plus `published_at timestamptz`, `expires_at timestamptz` (default `published_at + interval '14 days'`, but store the duration as a **backend config constant**, not hardcoded per-row math, so it can change later without a schema change), `application_limit int` reserved for §6.
- Expiry must be enforced **server-side on read/write**, not by a background job alone (spec explicitly calls this out, and the backend has no cron infra to add reliably on Railway free/hobby tiers anyway). Cheapest correct approach: a computed/derived status check in the query layer (`WHERE status='ACTIVE' AND expires_at > now()`) used everywhere gigs are listed for discovery/application, plus a lazy "flip to EXPIRED" write the next time the gig is read by its owner (or a lightweight `node-cron` sweep run in the Express process if the team wants status to update proactively rather than lazily — pick one, don't build both).
- Application endpoint (`application.service.js`, gig apply path) must reject applications to expired gigs even if the frontend is stale — add the expiry check next to the existing capacity check from §6 since they're the same guard clause.
- Frontend: gig detail/list components show an "Applications closed" state when expired; exclude expired gigs from marketplace/discovery queries (already filtered by status, just add the expiry predicate); keep expired gigs visible in the Brand's own gig list and to Creators who already applied.

**Files**: `Backend/supabase/migrations/schema.sql`, `Backend/src/services/gig.service.js`, `Backend/src/services/application.service.js`, `Frontend/src/features/gigs/GigDetail.tsx` and marketplace/dashboard list components.

## 6. Pricing tiers + campaign/application-slot system

**Current state**: nothing exists — no plan/subscription tables or code. The only adjacent primitive is the unrelated trial-credits system (`brands.credits`, hiring-cost RPCs in `credits.js`) — don't conflate the two; slots gate *how many applications a campaign can receive*, credits gate *the cost of accepting one*. They compose but are separate concerns.

**Changes** (new subsystem, so this is the one area where new abstraction is actually warranted):
- New tables: `plans` (`id, name, price, campaign_limit, application_slot_limit`) seeded with Free/Starter(₹99)/Growth; `brand_plan_usage` or simply columns on `brands` (`plan_id`, plus derived/aggregate campaign+slot usage computed from `gigs`, not duplicated state that can drift).
- `gigs.application_slots` (per-campaign allocation, part of the `application_limit` column from §5) with a DB constraint: `SUM(application_slots) WHERE brand_id = X AND status != 'CLOSED'` ≤ plan's `application_slot_limit`, and `application_slots >= 1` for any active campaign. Enforce this as a Postgres check via a trigger or an atomic RPC (mirroring the existing `debit_brand_credits`-style RPC pattern already used for credits) rather than only in application code, since the spec explicitly calls out "every active campaign must have ≥1 slot" as a hard invariant.
- Application endpoint gains a capacity check: count `applications` per gig against `application_slots`, reject with the spec's exact message once full. Also enforce "no duplicate application from same Creator to same Gig" — check whether this constraint already exists (likely a unique index on `(gig_id, creator_id)` — verify before assuming it's missing).
- Brand-facing UI: slot allocation editor when creating/editing a campaign (must respect the ≥1-per-campaign and ≤plan-total constraints live in the form, mirrored server-side), and a capacity readout ("8/16 applications — 8 slots remaining") on the gig detail/applicants page.
- Explicitly **not** in this phase: payment processing. Plan assignment can be a manual/admin-set field for now (spec allows this) — don't build a billing integration nobody asked for yet.

**Files**: new `Backend/supabase/migrations/schema.sql` additions, new `Backend/src/services/plan.service.js`, edits to `gig.service.js` and `application.service.js`, new frontend components for plan display + slot allocation.

## 7–8. Google Maps location matching

**Current state**: this is the area where the spec most overestimates remaining work. Real geocoding, lat/lng storage, haversine distance, and server-side radius filtering already ship in production (`geo.service.js`, `list_gigs_in_radius` RPC, `pincodes` table). What's missing:
- **Brand-side location picker on gig creation** — today `gigs.city` defaults to `'Pune'` with no map UI; the spec wants search-and-select via Google Places.
- **Geocoding coverage** — the `pincodes` table is hardcoded to Pune's `411xxx` range. Supporting other cities needs either a real geocoding API call (Google Geocoding API) instead of/alongside the static table, or manually extending the table (doesn't scale).

**Changes**:
- Add a Google Maps Platform API key, restricted server-side. **Proxy Places/Geocoding calls through the backend** (`Backend/src/services/geo.service.js`, extending the existing module) rather than embedding a frontend Google Maps JS SDK — this matches the security pattern the codebase already uses for Instagram ("secrets never touch the frontend") and avoids pulling in a heavyweight client library for what's essentially two REST calls (Places Autocomplete, Geocoding). Frontend hits a thin backend endpoint (e.g. `GET /api/geo/autocomplete?q=`) which forwards to Google server-side.
- `GigCreate.tsx`/`GigEdit.tsx`: replace the implicit Pune default with a location-search input (calls the new backend autocomplete endpoint), storing resolved `lat/lng` on the gig — the radius selector (2/5/10/20/Anywhere) already exists as `radiusKm`, no change needed there.
- Extend `geo.service.js`'s geocoding to call the real Google Geocoding API for pincodes outside the current Pune-only table (fall back to the static table first to avoid unnecessary API cost, call Google only on miss, cache the result back into `pincodes`).
- Location matching enforcement, exact-address privacy, and city-only display are **already correctly implemented** server-side (`list_gigs_in_radius`, `haversine_km`) — verify against the spec's checklist in §22 but expect no changes needed here.

**Files**: `Backend/src/services/geo.service.js`, new `Backend/src/api/geo.routes.js` (or extend an existing one), `Frontend/src/features/gigs/GigCreate.tsx`/`GigEdit.tsx`.

## 9. Instagram follower sync

**Current state**: this is essentially done. `instagram.service.js` already does real Meta OAuth (not scraping), stores `igFollowersCount`/`igUsername`/etc. on `influencers`, and `syncInfluencerIgData` already refreshes tokens and re-syncs metrics for tokens expiring within 7 days.

**Changes**: the one gap against the spec is a **periodic (24h) sync trigger** — confirm whether `syncInfluencerIgData` currently only runs on-demand (e.g. on profile view) versus on a schedule. If on-demand only, add a lightweight scheduled sweep (same mechanism decided in §5 for gig expiry — don't build two different scheduling approaches in one project). Display "Updated X days ago" using the already-stored sync timestamp — likely just a frontend formatting addition if the timestamp is already returned to the client.

**Files**: `Backend/src/services/instagram.service.js` (scheduling only), relevant Creator-profile frontend component for the "Updated N days ago" label.

## Data model changes (consolidated)

All additive to `Backend/supabase/migrations/schema.sql` (per this repo's convention — `migration.sql` stays the untouched base):
- `users`: no change (Clerk fields already present).
- `gigs`: extend `status` enum, add `published_at`, `expires_at`, `application_slots`, `latitude`, `longitude` (if not already present alongside `radiusKm` — verify), backfill existing rows.
- `plans` (new table) + `brands.plan_id`.
- `pincodes`: extend beyond Pune or add a geocoding-miss fallback path (no schema change if using live API + cache-back).

## Delivery order

Following the spec's own priority list, adjusted for the corrected scope in §0:

1. **P1 — Stability & UX**: ErrorBoundary, Accept/Reject/Logout/Delete-Gig confirmation dialogs, profile picture cropping. Independent, low-risk, ships first.
2. **P2 — Gig lifecycle**: status enum extension + expiry enforcement. Needed before P3 since slot limits attach to the same `gigs` row/columns.
3. **P3 — Pricing & slots**: new subsystem, biggest net-new surface area.
4. **P4 — Location**: mostly UI + geocoding-coverage work given existing backend; can actually run in parallel with P2/P3 since it touches different files.
5. **P5 — Instagram scheduling**: smallest remaining gap, do last.
6. **Auth (§1)**: sequence this independently based on the team's answer to the Google-removal open question — it's low-code-risk but has real user-facing/support-load risk (existing users losing their login method), so treat the *cutover timing* as a business decision, not just an engineering one.

Each feature still follows the spec's own per-feature loop: inspect → plan DB → plan backend → implement backend → implement frontend → test success/failure/edge cases → verify existing functionality → document. Don't start the next phase until the current one is verified working.

## Open questions requiring a decision before implementation

1. Is Google OAuth being fully removed, or kept as a secondary login option alongside phone? (§1)
2. What happens to existing users who signed up via email/Google once phone-only is live — silent lockout, in-app prompt to add a phone number, or a grace period? (§1)
3. Proactive (cron-based) vs. lazy (on-read) status flips for gig expiry — pick one mechanism and reuse it for Instagram sync too, rather than building two schedulers. (§5, §9)
4. Is a real-time Google Geocoding API call acceptable (cost, external dependency) or should coverage stay a manually-maintained static table expanded city-by-city? (§7-8)
5. Confirm whether a unique `(gig_id, creator_id)` constraint already exists on `applications` before building duplicate-prevention logic that might already be there. (§6)
