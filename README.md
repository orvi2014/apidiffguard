# APIDiffGuard

Catch breaking API changes before your clients do.

Monitor API responses, detect schema drift, compare versions, and alert developers before integrations break.

**Cloud:** [apidiffguard.vercel.app](https://apidiffguard.vercel.app) · **Source:** [github.com/orvi2014/apidiffguard](https://github.com/orvi2014/apidiffguard)

## Open core

This repo is **MIT open source**. Our business is the **hosted Cloud** product.

| Layer | License | Role |
| --- | --- | --- |
| `@apidiffguard/diff` (`packages/diff-engine`) | MIT | Reusable JSON/API diff engine |
| Free tools, docs, blog | MIT | SEO / community / self-serve value |
| Full app (console + API) | MIT | Self-hostable; Cloud is the paid path |
| APIDiffGuard brand | Trademark | Not a software license |

Self-host if you want. Most teams use Cloud so they do not operate Supabase, schedules, and alerting themselves.

See [LICENSING.md](./LICENSING.md) for the full model.

## Stack

- Next.js (App Router) · React 19 · TypeScript
- Tailwind CSS · shadcn/ui · Fumadocs (docs + blog)
- Supabase Auth + Postgres + RLS
- Vercel

## Quick start (self-host)

```bash
npm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Apply DB migrations:

```bash
npx supabase db push
```

## Free tools (no login)

- [/tools/json-diff](https://apidiffguard.vercel.app/tools/json-diff)
- [/tools/json-formatter](https://apidiffguard.vercel.app/tools/json-formatter)
- [/tools/json-validator](https://apidiffguard.vercel.app/tools/json-validator)

## Docs & blog

Content lives in MDX via Fumadocs:

- `content/docs/` → `/docs`
- `content/blog/` → `/blog`

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

MIT — see [LICENSE](./LICENSE) and [LICENSING.md](./LICENSING.md).
