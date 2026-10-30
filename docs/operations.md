# StatWise.in — Operations

## Where things live

| What | Where | Login |
|---|---|---|
| Admin (write and publish) | https://statwise.sanity.studio | Sanity account (Google) |
| Sanity project settings | https://www.sanity.io/manage/project/mpsmehrh | Sanity account |
| Website | https://statwise.in (www redirects here). The workers.dev copy is kept out of search results. | — |
| Domain registrar | Hostinger hPanel. Renews 2027-10-30. Nameservers: clyde/dalary.ns.cloudflare.com | Hostinger |
| Hosting dashboard and build logs | dash.cloudflare.com → Workers & Pages → `statwise` | Cloudflare |
| Code | https://github.com/yogeshbuilds/StatWise.in | GitHub `yogeshbuilds` |

## How publishing works

1. You click **Publish** (or Unpublish / Delete) on an article or category in the Studio.
2. The Sanity webhook **"Rebuild website"** (sanity.io/manage → project → API → Webhooks) sends a POST to a Cloudflare **Deploy Hook** (`sanity-publish`, under Worker `statwise` → Settings → Build → Deploy Hooks).
3. Cloudflare Workers Builds rebuilds the site from GitHub `main`. The build fetches the published content, and the new version goes live in about 1–2 minutes.

Notes:
- **Saving a draft does not trigger a rebuild.** The webhook has "Drafts and versions" switched off.
- **Duplicate events are harmless.** Cloudflare merges triggers that arrive while a build is still queued.
- **Code changes pushed to GitHub `main` also rebuild the site.**
- **Manual rebuild:** Cloudflare → Workers & Pages → `statwise` → Deployments → **Retry** the latest build. You can also push any commit.
- **The Deploy Hook URL is a secret.** Anyone who has it can trigger builds (they cannot change content). If it leaks, delete the hook in Cloudflare, create a new one, and paste the new URL into the Sanity webhook.
- **Changing a published article's slug:** add the old slug to "Old URLs". The build then writes a 301 redirect into `_redirects`.

## When a build fails

- The **live site stays on the last successful version**. A failed build never replaces it.
- To see what went wrong: Cloudflare → Workers & Pages → `statwise` → **Deployments / Builds** → open the failed build → **Build log**. The error is usually near the end.
- Common causes:
  - A code change that doesn't compile. Fix it or revert the commit on GitHub.
  - Sanity temporarily unreachable. Just **Retry** the build.
- After fixing the problem, retry the build or publish again in Sanity.
- To check the whole pipeline end to end (it creates and removes a hidden test article):
  `cd studio && SITE=https://statwise.in npm run test:publishing`

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
