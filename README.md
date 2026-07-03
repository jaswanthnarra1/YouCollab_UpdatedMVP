# YouCollab — Influencer Collaboration Marketplace

> Where Pune's brands meet creators 🚀

A localized influencer collaboration marketplace focused on Pune. Brands post gigs, creators apply, collaboration happens.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/Radix UI, TanStack React Query, Zustand |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth + app-issued JWTs (access + refresh), email OTP verification |
| Email | Gmail SMTP (nodemailer) |
| Uploads | Multer (local `uploads/`, cloud-ready) |
| Integrations | Instagram Graph API |

## Architecture

Monorepo with a decoupled React SPA and an Express REST API backed by Supabase.
In production the Express server also serves the built frontend, so the whole app
ships as a single container (see `Dockerfile` / `railway.toml`).

```
You-Collab-AIG/
├── Backend/              # Express + Supabase API
│   ├── src/
│   │   ├── api/          # Route definitions (per domain)
│   │   ├── controllers/  # HTTP handlers
│   │   ├── services/     # Business logic + Supabase queries
│   │   ├── models/       # Zod validation schemas
│   │   ├── middleware/   # Auth, role guard, rate limiting, upload, errors
│   │   ├── config/       # Environment config
│   │   └── utils/        # AppError, asyncHandler, logger, pagination
│   ├── supabase/         # Client, migrations, seed
│   └── uploads/          # Local file storage
├── Frontend/             # React + Vite SPA
│   └── src/
│       ├── features/     # Feature-sliced pages (auth, dashboard, gigs, ...)
│       ├── components/   # ui/, common/, layout/
│       ├── services/     # Typed API wrappers
│       ├── stores/       # Zustand (persisted auth)
│       └── lib/          # Axios client, supabase client, utils
├── Dockerfile            # Multi-stage build (frontend + backend)
├── railway.toml          # Railway deploy config
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 22+ (Supabase JS v2 requires native WebSocket support)
- A Supabase project (URL + anon key + service-role key)
- A Gmail account with an App Password (for OTP emails; optional in dev — OTPs are logged to the console)

### 1. Install dependencies

```bash
npm run install:all      # installs both Backend and Frontend
```

### 2. Configure environment

```bash
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env
# Fill in the values (see "Environment Variables" below)
```

### 3. Set up the database

```bash
npm run db:migrate       # applies Backend/supabase/migrations
npm run db:seed          # seeds demo accounts + data
```

### 4. Run development servers

```bash
npm run dev              # backend :5000  +  frontend :8080 (concurrently)
```

Or run them separately: `npm run dev:backend` / `npm run dev:frontend`.

### 5. Open the app

Visit [http://localhost:8080](http://localhost:8080). The API runs on
[http://localhost:5000](http://localhost:5000) (`GET /api/health` for a heartbeat).

## Environment Variables

### Backend (`Backend/.env`)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase connection |
| `JWT_SECRET` | Signs access/refresh tokens (**required in production**) |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `DATABASE_URL` | Postgres connection string |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME` | Gmail SMTP for OTP emails |
| `CLIENT_URL` | Allowed CORS origin(s), comma-separated |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` | Instagram Graph API |
| `MAX_FILE_SIZE`, `UPLOAD_DIR` | Upload limits/location |
| `PORT`, `NODE_ENV` | Server config |

### Frontend (`Frontend/.env`)
| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (empty in prod → relative calls) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client |

## Authentication Flow

1. **Register** → creates an unconfirmed Supabase Auth user, stores signup data + a
   hashed 6-digit OTP in `email_otps`, emails the OTP (in dev it's also logged/returned).
2. **Verify OTP** → confirms the Auth user, creates the `public.users` row + role profile,
   issues app JWTs (access ~15m, rotating refresh ~7d).
3. **Login** → validates credentials via Supabase Auth, issues app JWTs, stores a
   bcrypt-hashed refresh token.
4. **Refresh** → rotating refresh tokens; the frontend axios interceptor auto-refreshes on 401.

## Seed Accounts

| Email | Password | Role |
|---|---|---|
| cafe@youcollab.in | password123 | Brand |
| urbanfit@youcollab.in | password123 | Brand |
| priya@youcollab.in | password123 | Influencer |
| arjun@youcollab.in | password123 | Influencer |
| sneha@youcollab.in | password123 | Influencer |

## Deployment

- **Single container (Railway):** the multi-stage `Dockerfile` builds the frontend and
  serves it from the Express backend. Configure via `railway.toml` + Railway variables.
- **Split hosting:** the frontend can also be deployed standalone (see `Frontend/vercel.json`)
  pointing `VITE_API_BASE_URL` at a separately hosted backend.

## License
MIT
</content>
</invoke>
