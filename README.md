# Legal Workspace

A professional legal practice management platform for lawyers worldwide.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access token 15m) + Refresh tokens (7d) + bcrypt |
| AI | Groq via server-side provider registry (never exposes API key to browser) |

---

## Project Structure

```
pryrolaw/
├── src/                    # React frontend
│   ├── components/
│   ├── context/            # AuthContext (JWT-based)
│   ├── hooks/              # useApi hook
│   ├── lib/
│   │   └── api.ts          # Typed API client (replaces Supabase)
│   └── pages/
│
└── server/                 # Express backend
    ├── prisma/
    │   └── schema.prisma   # Full relational schema
    └── src/
        ├── controllers/    # Request handlers
        ├── services/       # Business logic
        │   └── ai/         # Provider-agnostic AI layer
        ├── routes/         # Express routers
        ├── middleware/      # Auth, validation, rate limiting, errors
        └── lib/            # Prisma client, JWT, password utils
```

---

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally (or connection URL)

### 2. Backend setup

```bash
cd server
npm install

# Copy env and fill in your values
copy .env.example .env
# Edit server/.env:
#   DATABASE_URL=postgresql://postgres:password@localhost:5432/legal_workspace
#   JWT_SECRET=your-long-random-secret
#   REFRESH_TOKEN_SECRET=another-long-random-secret
#   GROQ_API_KEY=your-groq-api-key   (optional — AI won't work without it)

# Generate Prisma client
npm run db:generate

# Run migrations (creates the database tables)
npm run db:migrate

# (Optional) Seed with demo data
npm run db:seed
# Demo account: demo@legalworkspace.com / password123

# Start the server
npm run dev
# → API running at http://localhost:4000
```

### 3. Frontend setup

```bash
# From project root
npm install

# .env is already configured for local dev:
# VITE_API_URL=http://localhost:4000/api

npm run dev
# → App running at http://localhost:5173
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| GET/PUT | /api/profile | Lawyer profile |
| GET | /api/dashboard | Dashboard summary |
| CRUD | /api/cases | Cases + notes + timeline |
| CRUD | /api/clients | Clients |
| CRUD | /api/documents | Documents + file upload |
| CRUD | /api/tasks | Tasks |
| CRUD | /api/calendar | Calendar events |
| CRUD | /api/ai/conversations | AI conversations + messages |

---

## Adding a new AI provider

1. Create `server/src/services/ai/providers/openai.provider.ts` implementing `AIProvider`
2. Register it in `server/src/services/ai/ai.service.ts`:
   ```ts
   AIService.register(new OpenAIProvider());
   ```
That's it. No other files change.

---

## Security notes

- JWT secrets must be strong random strings in production
- GROQ_API_KEY is server-side only — never exposed to the browser
- All routes are protected by the `authenticate` middleware
- Row-level isolation: every query filters by `userId`
- Password hashing: bcrypt with 12 salt rounds
- Rate limiting: 300 req/15min general, 20 req/15min on auth endpoints
