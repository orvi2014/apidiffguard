# Contributing

## Open-source package

The publishable core lives in [`packages/diff-engine`](packages/diff-engine).

```bash
cd packages/diff-engine
npm install
npm run build
```

App-facing helpers (JSON tree UI builders) stay in `src/lib/diff-engine.ts` and wrap the same comparison ideas.

## Free tools & blog

- Tools: `src/app/tools/**`
- Blog: `src/app/blog/**` + `src/lib/blog.ts`

Keep free tools usable without auth. Always include a clear CTA to the hosted product.

## GTM docs

See [`docs/gtm/`](docs/gtm/) for ICP, email templates, and community guidelines.
