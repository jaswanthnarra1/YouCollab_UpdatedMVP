# Rebuild landing to match the Triage template, YouCollab content

The original Triage template landing was overwritten in the previous turn. I'll restore its exact structure from git (commit `653c968`, `src/pages/Landing.tsx`) and swap only the **copy + the mock dashboard contents** for YouCollab. Layout, spacing, typography, slate accent, 3D cube, sticky top nav, and the mock UI frame stay identical.

## Sections (in order, matching the template)

1. **Top nav** (fixed, 56px, `max-w-[1200px]`)
   - Stacked logo + wordmark `YOUCOLLAB` (bold uppercase, `tracking-[0.08em]`)
   - Theme toggle (kept)
   - "Log in" link → `/login`
   - "Sign up" button → `/register`

2. **Two-column hero** (text left, 3D cube right — `Logo3D` kept as-is)
   - H1: **"Where Pune's brands and creators actually find each other."**
   - Sub: **"Purpose-built for Pune. Verified Instagram, real briefs, real budgets — collab without DMs or ghosting."**
   - CTA: **"Get started free →"** → `/register`

3. **Mock product frame** (same 3-pane card: left sidebar / middle list / right detail panel)
   - Left sidebar nav items become (visual chips only, no logic):
     `Dashboard`, `Gigs`, `Pitches`, `Messages`, plus a "Categories" group with `Cafe`, `D2C`, `Fashion`
   - Middle list rows become **live gigs** instead of bug rows. Each row keeps the exact 4-cell shape (priority dot, ID, title bar, status dot + avatar):
     - Dot color = category accent (`primary`, `warning`, `destructive`, `success`, `muted-foreground/30`)
     - ID = `GIG-142`, `GIG-139`, `GIG-138`, `GIG-135`, `GIG-131`, `GIG-128`, `GIG-125`
     - Status dot = application state (open / in review / accepted)
   - Right detail panel keeps the exact placeholder bars; just relabel the section header concept to "Gig details" (visual only).

4. **Below-the-fold sections** (whatever exists past line 300 of the original — I'll preserve every section, swapping copy 1:1):
   - Feature highlights, "how it works", testimonial card, final CTA, footer.
   - I'll read lines 300-end of the original before implementing so nothing is missed.

## Copy swaps (Triage → YouCollab)

| Original | New |
|---|---|
| Triage | YouCollab |
| Bug tracking for teams that ship fast | Where Pune's brands and creators actually find each other. |
| Purpose-built for engineering teams… | Purpose-built for Pune. Verified Instagram, real briefs, real budgets — collab without DMs or ghosting. |
| `TRG-###` | `GIG-###` |
| Bug / Issue / Severity | Gig / Pitch / Category |
| Testimonial quote about engineering | Quote from a Pune creator/brand (placeholder, e.g. owner of a Koregaon Park cafe) |

The exact final copy for the testimonial, feature blocks, and footer will be derived from the original strings in lines 300-end and adapted to YouCollab phrasing.

## What stays untouched

- All design tokens, slate accent override (`--primary: 215 14% 55%` in dark, `215 16% 47%` in light), border colors, shadows.
- `Logo3D` cube + zoom/responsive behavior.
- `StackedLogo` component (wordmark just changes to YOUCOLLAB).
- Theme toggle (Sun/Moon).
- All Tailwind class strings on structural elements — only text content and the small data arrays change.
- Routes wired: nav buttons go to `/login` and `/register` (already exist in the app).

## What gets removed from my previous landing

- Neon gradient backdrop (`neon-grid`)
- Glassmorphic chips, `bg-gradient-brand` CTAs, `text-gradient` headline, framer-motion entrance choreography, "Browse by category" pills, live-gigs query/grid, CTA cards section, "Built in Pune" footer.
- All of this is replaced by the template's static, minimal Linear-style layout.

## Files touched

- `src/pages/Landing.tsx` — full rewrite to mirror `653c968:src/pages/Landing.tsx`, with copy + mock data swapped.
- No other files change. `Navbar.tsx`, `AuthPage.tsx`, dashboards, services — all unaffected.

## Verification

- After build, open `/` and confirm: fixed top nav, hero text left, 3D cube right, mock dashboard frame with 7 `GIG-###` rows, slate accent (no neon gradients), same below-fold sections as the template.
- Confirm CTA buttons route to `/register` and `/login`.
