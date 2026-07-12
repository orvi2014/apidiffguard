# APIDiffGuard

Catch breaking API changes before your clients do.

Monitor API responses, detect schema drift, compare versions, and alert developers before integrations break.

**Live:** [apidiffguard.vercel.app](https://apidiffguard.vercel.app) · **Repo:** [github.com/orvi2014/apidiffguard](https://github.com/orvi2014/apidiffguard)

## Stack

- Next.js (App Router) · React 19 · TypeScript
- Tailwind CSS · shadcn/ui · Motion
- Supabase Auth + Postgres + RLS
- Vercel

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Apply DB migrations with the Supabase CLI against your project:

```bash
npx supabase db push
```

## Free tools (no login)

- [/tools/json-diff](/tools/json-diff)
- [/tools/json-formatter](/tools/json-formatter)
- [/tools/json-validator](/tools/json-validator)

## Scripts

| Command         | Description                |
|-----------------|----------------------------|
| `npm run dev`   | Development server         |
| `npm run build` | Production build           |
| `npm run start` | Start production server    |
| `npm run lint`  | ESLint                     |
| `npm run test`  | Unit tests                 |

## Security notes

- Outbound URL fetches (checks / OpenAPI import) block private hosts, re-validate redirects, and cap response size.
- `/api/*` fetch routes require an authenticated session and are rate-limited.
- Auth `next` redirects are restricted to same-origin relative paths.
- Membership self-join is blocked in RLS; workspace creation goes through `create_workspace()` or the signup trigger.

## License

MIT — see `packages/diff-engine` for the reusable diff package; app code in this repo is MIT unless noted otherwise.
