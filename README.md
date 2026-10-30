# StatWise.in

A low-maintenance publication that turns public data about India into clear, sourced stories.
Articles are **text + images only**; charts and maps are made elsewhere and uploaded as images.

- **PRD and task tracker:** kept privately by the owner (not in this repo)
- **Decisions:** [`docs/decision-log.md`](docs/decision-log.md)
- **Categories:** [`docs/categories.md`](docs/categories.md)

## Stack

| Part | Tool | Folder |
|---|---|---|
| Public website | Astro (static output) | `web/` |
| Admin / CMS | Sanity Studio + Content Lake | `studio/` (Phase 2) |
| Hosting | Cloudflare Workers (static assets) | `web/wrangler.jsonc` |
| Publish → deploy | Sanity webhook → GitHub Actions → Cloudflare (Phase 5) | — |

Article content lives in Sanity, not in this repository. Publishing an article never requires Git.

## Run the website locally

Requires Node 22.23+ (Node 24 recommended; see `web/.nvmrc`).

```bash
cd web
cp .env.example .env   # fill in the Sanity project ID once it exists
npm install
npm run dev            # http://localhost:4321
npm run build          # output in web/dist
```

## Cloudflare Workers build settings

The site is served as static assets by a Cloudflare Worker (`web/wrangler.jsonc`).

| Setting | Value |
|---|---|
| Project / Worker name | `statwise` (must match `name` in `wrangler.jsonc`) |
| Path (root directory) | `web` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| API token | Let Cloudflare create one automatically |
| Build variables | the `PUBLIC_SANITY_*` values from `web/.env.example` (Phase 2) |

## Secrets

- No secrets belong in this repo.
- The Cloudflare deploy hook URL is stored only in Sanity's webhook settings.
- Any Sanity token with write access stays in Sanity and is never used by the website.
