# APIDiffGuard

Catch breaking API changes before production.

Monitor API responses, detect schema drift, compare versions, and alert developers before integrations break.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS · Framer Motion
- Prisma · PostgreSQL
- Designed for Supabase Auth, Resend, Upstash Redis, Trigger.dev, Vercel

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The console is populated with demo data so you can explore the Diff Viewer, endpoints, alerts, and schedules without wiring services.

### Signature surface

Open the live diff:

[http://localhost:3000/diff/diff_users_latest](http://localhost:3000/diff/diff_users_latest)

Keyboard: `⌘K` command palette · `n` / `p` jump between changes.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start development server |
| `npm run build`| Production build         |
| `npm run start`| Start production server  |
| `npm run lint` | ESLint                   |
| `npm run test` | Unit tests (diff engine) |

## Project structure

```
src/
  app/
    (console)/     # IDE-style product shell
    login|register # Auth screens
    pricing|docs   # Marketing
  components/
    diff/          # DiffViewer, DiffTree, JSONViewer
    domain/        # Badges, endpoints, activity
    layout/        # AppShell, CommandPalette
    marketing/     # Landing chrome + demo
  lib/
    diff-engine.ts # JSON compare + tree builder
    mock-data.ts   # Demo workspace data
prisma/
  schema.prisma    # Full data model
```

## Database

```bash
npx prisma generate
npx prisma db push
```

Requires a PostgreSQL `DATABASE_URL` in `.env`.

## Design

Dark-first monochrome UI with a single blue accent (`#4F7FFF`). Layout borrows from IDE / DevTools patterns — sticky toolbars, inspector panes, timelines — not admin dashboard cards.
