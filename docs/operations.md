# StatWise.in — Operations

## Where things live

| What | Where | Login |
|---|---|---|
| Admin (write and publish) | https://statwise.sanity.studio | Sanity account (Google) |
| Sanity project settings | https://www.sanity.io/manage/project/mpsmehrh | Sanity account |
| Website (temporary URL) | https://statwise.personalyogesh352.workers.dev | — |
| Hosting dashboard and build logs | dash.cloudflare.com → Workers & Pages → `statwise` | Cloudflare |
| Code | https://github.com/yogeshbuilds/StatWise.in | GitHub `yogeshbuilds` |

## Content backup (export): do this monthly and before big changes

```bash
cd studio
npm run export
```

- This writes `exports/statwise-YYYY-MM-DD.tar.gz` at the repo root.
- The file contains `data.ndjson` (every document as JSON) plus every image and file.
- `exports/` is git-ignored. Copy the file somewhere outside this computer and outside Sanity, such as Google Drive.

## Restore / migrate

```bash
cd studio
npx sanity dataset import ../exports/statwise-YYYY-MM-DD.tar.gz production --replace
```

- `--replace` overwrites documents that have the same ID.
- To test a restore safely, import into a new dataset first: `npx sanity dataset create restore-test`, then import with `restore-test` instead of `production`.
- `data.ndjson` is plain JSON lines, so it can be converted for another CMS if needed.

## Utility scripts (in `studio/`)

| Command | What it does |
|---|---|
| `npm run dev` | Studio locally at http://localhost:3333 |
| `npx sanity deploy` | Publish Studio changes to statwise.sanity.studio |
| `npm run seed:categories` | Re-create the starting categories (skips existing ones) |
| `npm run test:drafts` | Re-run the draft-privacy check (creates and deletes a test draft) |
| `npm run export` | Content backup (above) |

## Provider limits to watch (Free plans, checked 2026-10-30)

- **Sanity:** 10k documents, 250k API requests/month, 100 GB bandwidth/month, 100 GB assets, 2 webhooks. Usage is shown at sanity.io/manage → project → Usage.
- **Cloudflare Workers (static assets):** free static requests; builds come from the Workers Builds free allowance. Check the Cloudflare dashboard → Workers & Pages → `statwise` → Metrics.
