# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Private World Cup 2026 prediction pool ("polla") for groups of 10–30 people. Mobile-first Next.js 14 (App Router) PWA. Code, UI, and domain language are in **Spanish** — keep that convention (e.g. `Prediccion`, `Partido`, `calcularPuntos`, `FasePartido`).

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # next lint (eslint)
npm test                 # vitest run (all tests)
npm run test:watch       # vitest watch mode
npx vitest run tests/scoring.test.ts   # run a single test file

npm run db:migrate       # prisma migrate dev (creates/applies migration)
npm run db:seed          # seed test data (tsx prisma/seed.ts)
npm run db:reset         # reset DB + reseed
npm run db:studio        # Prisma Studio
```

Seed credentials: admin `admin@polla.com` / player `carlos@example.com`, both `password123`. Invite code `SEED0000`.

## Architecture

**Stack:** Next.js 14 App Router + TypeScript, Prisma ORM over PostgreSQL (Neon in prod), NextAuth v4 (credentials provider), Tailwind, Resend (email), web-push/VAPID (push), football-data.org (live results), Vercel Cron.

**Route protection:** `src/middleware.ts` wraps NextAuth middleware to guard all authenticated pages (`/fixture`, `/tabla`, `/partido`, `/jugador`, `/perfil`, `/admin`). API routes check auth/role individually.

**Data layer:** Prisma singleton in `src/lib/prisma.ts`. Models: `User`, `Partido`, `Prediccion`, `Configuracion`, `Notificacion`, `PushSubscription`, `NotifPreferencia`. Enums: `Role`, `FasePartido`, `EstadoPartido`.

### Scoring (`src/lib/scoring.ts`) — the core domain logic, unit-tested

Points are **cumulative and independent** per match. Group-stage values, doubled (`mult = 2`) for knockout phases:
- Correct outcome (win/draw): 5 / 10
- Exact home goals: 2 / 4 · Exact away goals: 2 / 4 · Exact goal difference: 1 / 2 (max 10 / 20)

Knockout phases (`FASES_ELIMINATORIAS`) score on **90-min regulation time only**, never extra time/penalties.

### Result ingestion (`src/lib/espn-api.ts` + `src/lib/worldcup26.ts`)

Primary source is ESPN's public scoreboard API (no key needed); `src/app/api/sync/route.ts` maps events to `Partido` rows (dedup by `externalId` first, then TLA/date fallback, all resolved against one in-memory snapshot of the table). worldcup26.ir is a secondary live-score source only. ESPN scores are full-time; when a knockout match goes to extra time, the admin corrects the 90-min result via the manual editor (`AdminMatchEditor`), which sets `resultadoManual` so sync won't overwrite it.

### Prediction locking

Predictions can be created/edited until the **exact kickoff time**. The backend enforces this — never rely on frontend-only checks.

### Sync & notifications (cost-sensitive)

DB is Supabase (Postgres); the binding constraint is **Vercel Hobby Fluid CPU** (4h/month), so every serverless invocation and SSR render counts:
- `src/lib/sync-window.ts` decides *whether* to run using **only the clock** (`enVentanaPartidos`: 15:00–06:00 UTC; `tocaSyncAhora` throttling). Don't add DB queries here.
- External cron (cron-job.org job 7803392) POSTs to `/api/sync` with Bearer `CRON_SECRET`; currently **disabled** to conserve CPU — the admin syncs manually from `/admin`. Pre-match notifications are processed *inside* sync (a single 1h reminder), not a separate poll.
- Notification engine: `src/lib/notifications.ts` (orchestration, batched createMany + parallel push), `src/lib/email.ts` (Resend), `src/lib/push.ts` (VAPID).
- Fixture and tabla pages cache their shared query via `unstable_cache(60s)`; per-user data is a separate light query. Client components fetch lazily (e.g. NotificationBell only queries when opened) and never poll.

When adding any fetch-on-mount, polling, or `router.refresh()`, weigh Vercel CPU cost — recent commits have repeatedly cut it.

### Frontend

`src/app/*` route folders (Spanish names: `fixture`, `tabla`, `partido/[id]`, `jugador/[id]`, `perfil`, `admin`, `reglas`). Layout/shell in `src/components/layout`. Timezone helpers in `src/lib/utils.ts` target America/Santiago. PWA assets: `public/manifest.json`, `public/sw.js`, `public/icons/`.

## Environment

Copy `.env.example` → `.env.local`. Required: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `FOOTBALL_DATA_API_KEY` (competition code `WC`), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), `CRON_SECRET`.
