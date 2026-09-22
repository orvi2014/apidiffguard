# Polar product IDs

Production Polar account. **Names are duplicated** — there are two products
called "Starter" and two called "Pro", at the old and new prices. Copy IDs from
here rather than picking by name in the dashboard.

## Current tiers (what the app should point at)

| Env var | Product | Price | ID |
| --- | --- | --- | --- |
| `POLAR_PRODUCT_STARTER` | Starter | $29/mo | `3a56a950-8765-4435-84f8-83fe356bed1d` |
| `POLAR_PRODUCT_STARTER_YEARLY` | Starter Yearly | $290/yr | `d10ed9bf-c227-4e49-a632-d6ad1bd4ffc0` |
| `POLAR_PRODUCT_PRO` | Pro | $99/mo | `e239a4fa-0436-4e95-a6bf-1806e801b56b` |
| `POLAR_PRODUCT_PRO_YEARLY` | Pro Yearly | $990/yr | `ed339a4c-ecbd-40af-9e89-c8f28c68ea53` |
| `POLAR_PRODUCT_SCALE` | Scale | $299/mo | `6ef9b9ab-9d33-4458-9830-ac776a6cd3b4` |
| `POLAR_PRODUCT_SCALE_YEARLY` | Scale Yearly | $2,990/yr | `2248a14b-8e66-44f1-8c23-0c5474ca3275` |

## Superseded (keep, do not delete)

| Product | Price | ID |
| --- | --- | --- |
| Starter | $19/mo | `09afc791-84f9-470e-909b-e50639d5cecb` |
| Starter Yearly | $190/yr | `2819bd44-c6df-4c9d-8374-ba4aeb8e3116` |
| Pro | $49/mo | `dea6cecc-7fed-4b50-b121-5ff19ddbe278` |
| Pro Yearly | $490/yr | `57cb9208-c41b-4744-8269-e3d94c366d76` |

Existing subscriptions still bill against these ids.

`resolvePolarPlanFromProduct()` maps **only** the ids named by the env vars
above, so a legacy id does not resolve by product. The webhook, however, calls
`resolvePolarPlan()`, which falls back to `metadata.plan` — and checkout writes
that on every purchase it creates. **So a legacy subscription bought through the
app keeps resolving correctly after the env vars repoint.** That fallback exists
for exactly this case.

The residual risk is narrower: a subscription with no `metadata.plan` — created
by hand in the Polar dashboard, imported, or predating the metadata write —
resolves to `null`, and its renewal grants nothing. Check for those before
repointing:

```
GET /v1/subscriptions/?active=true   # confirm every row has metadata.plan
```

**Then decide:**

1. **Grandfather** — keep legacy subscribers on the old products and prices.
   Nothing to change; the metadata fallback already covers them.
2. **Migrate** — move existing subscriptions onto the new products in Polar,
   accepting the price change for those customers.

Archive the superseded products in Polar only after every subscription has left
them; archiving stops new checkouts, it does not cancel existing subscriptions.
