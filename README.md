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
| `yarn build` | Build SPA + bundle API |
| `yarn start` | Production: serve `dist/` + API on one port |
| `yarn db:migrate` | Apply pending SQL files in `server/sql/` |

## Deploy on Vercel (frontend + API together)

`vercel.json` runs **`yarn db:migrate && yarn build`** on each deploy:

1. Applies any new `server/sql/*.sql` files not yet recorded in `schema_migrations`
2. Builds the SPA (`dist/`) and API bundle (`api/index.js`)

### Adding a schema change

1. Add a new file, e.g. `server/sql/002_add_foo.sql` (never edit old applied files in prod)
2. Commit + deploy — migrate runs automatically during the Vercel build

### Vercel env (required at **Build** and Runtime)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres URL — enable for **Build** in Vercel env settings |
| `DATABASE_SSL` | `1` for RDS |
| `JWT_SECRET` | Long random secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_GOOGLE_CLIENT_ID` | Same client ID (frontend) |
| `VITE_API_BASE_URL` | `/api` |

Do **not** use `VITE_DATABASE_URL`.

If Production and Preview share one DB, Preview deploys will also migrate that DB — use a separate Preview DB if you need isolation.

Also add your Vercel domain under Google Cloud Console → OAuth client → Authorized JavaScript origins.
