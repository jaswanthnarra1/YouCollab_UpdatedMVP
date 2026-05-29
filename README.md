# YouCollab — Influencer Collaboration Marketplace

> Where Pune's brands meet creators 🚀

A localized influencer collaboration marketplace focused on Pune. Brands post gigs, creators apply, collaboration happens.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Query, Zustand |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (access + refresh tokens) |
| Upload | Multer (local, cloud-ready) |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (running locally)

### 1. Clone & Install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Database

```bash
cd server
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Run Migrations & Seed

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start Development

```bash
# Terminal 1 — Backend (port 5000)
cd server
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

### 5. Open App
Visit [http://localhost:5173](http://localhost:5173)

## Seed Accounts

| Email | Password | Role |
|---|---|---|
| cafe@youcollab.in | password123 | Brand |
| urbanfit@youcollab.in | password123 | Brand |
| priya@youcollab.in | password123 | Influencer |
| arjun@youcollab.in | password123 | Influencer |
| sneha@youcollab.in | password123 | Influencer |

## Project Structure

```
You-Collab-AIG/
├── server/           # Express + Prisma backend
│   ├── prisma/       # Schema + migrations + seed
│   ├── src/
│   │   ├── config/       # Environment config
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── middleware/    # Auth, validation, upload
│   │   ├── routes/       # Route definitions
│   │   ├── services/     # Business logic
│   │   ├── validators/   # Zod schemas
│   │   ├── utils/        # Helpers
│   │   └── lib/          # Prisma client
│   └── uploads/      # Local file storage
├── client/           # React + Vite frontend
│   └── src/
│       ├── api/          # Axios client + endpoints
│       ├── components/   # UI, layout, features
│       ├── hooks/        # React Query hooks
│       ├── pages/        # Route pages
│       ├── stores/       # Zustand stores
│       └── lib/          # Utilities
└── README.md
```

## License
MIT
