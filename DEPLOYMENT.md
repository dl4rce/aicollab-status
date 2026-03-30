# AI·Collab status page — deploy & maintenance

Long-form narrative, monitor list, and DNS: see **`aicollab-nexus`** repo → `documentation/core/operations/STATUS_PAGE.md`.

## Deploy (production)

Requires Node, Yarn, and [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) authenticated (`npx wrangler login`).

```bash
yarn install
yarn build          # client (out/) + Worker (dist/main.js) — both required
npx wrangler deploy
# or: yarn deploy
```

Do **not** run only `flareact build` + `wrangler deploy`: **`dist/main.js`** would stay stale (broken SSR histogram, old cron/UI code). `package.json` `build` includes `build:worker`.

## Maintenance banner (PLANNED / ACTIVE)

Configured in **`config.yaml`** → top-level `maintenance:`.

| Field | Purpose |
|-------|---------|
| `enabled` | `true` to show the section |
| `start`, `end` | ISO **UTC** (`...Z`), e.g. MESZ 19:00–21:00 → subtract 2h in April (CEST) |
| `displayTimeZone` | IANA zone for labels (default `Europe/Berlin`) |
| `announceDaysBefore` | Days **before** `start` the banner may appear (default 21) |
| `title`, `description`, `affectedServices` | Copy shown on the page |

**PLANNED** = now \< `start`. **ACTIVE** = `start` ≤ now \< `end`. No manual mode switch.

After the window: set `enabled: false`, then `yarn build && npx wrangler deploy`.
