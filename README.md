# Commit

Multi-tenant commitment tracker. React + Vite frontend, Express API, Postgres via Sequelize (raw SQL).

## Setup

1. Copy `.env.example` → `.env` and set `DATABASE_URL` (Postgres).
2. Install: `yarn`
3. Migrate: `yarn db:migrate`
4. Run API + web: `yarn dev`

- Web: http://localhost:5173 (proxies `/api` → `:3001`)
- API: http://localhost:3001

## Scripts

| Script | Purpose |
|--------|---------|
| `yarn dev` | API + Vite together |
| `yarn dev:api` | API only |
| `yarn dev:web` | Frontend only |
| `yarn build` | Build SPA to `dist/` |
| `yarn start` | Production: serve `dist/` + API on one port |
| `yarn db:migrate` | Apply SQL schema |

## Deploy on Vercel (frontend + API together)

The repo includes `api/index.ts` + `vercel.json` so one Vercel project serves the SPA and `/api/*`.

### Env vars on Vercel

**Server (safe — not exposed to the browser):**

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres connection string |
| `DATABASE_SSL` | `1` (recommended for hosted DB) |
| `JWT_SECRET` | Long random secret |
| `GOOGLE_CLIENT_ID` | Same Google OAuth client ID |

**Client (embedded in the JS bundle):**

| Variable | Notes |
|----------|--------|
| `VITE_GOOGLE_CLIENT_ID` | Same Google client ID |
| `VITE_API_BASE_URL` | `/api` (same origin) |

Do **not** use `VITE_DATABASE_URL`.

Also add your Vercel domain under Google Cloud Console → OAuth client → Authorized JavaScript origins.
