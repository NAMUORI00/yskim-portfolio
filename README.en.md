# yskim Portfolio

[한국어 README](README.md)

A portfolio that uses **Notion as the single source of truth**. Editing in Notion
both ① turns the Notion page itself into a shareable portfolio and ② lets GitHub
Actions pull that content and build/deploy a static site (`namuori.net`). One edit
covers both audiences — places that expect a Notion portfolio and places that just
want a website.

The flow:

1. Edit content in the Notion `KYS — Portfolio (CMS)` workspace.
2. Set each item's `Status` to `Published`.
3. `scripts/notion-content.mjs` regenerates `content/` (JSON + MDX) from Notion.
4. Vite builds the static site from `content/`.
5. Cloudflare Pages deploys it.

> The previous `/admin` flow (GitHub OAuth → draft branch → PR) has been removed.
> Editing now happens **only in Notion**.

## Architecture

```text
Notion (`Portfolio Entries` single DB) ──fetch──▶  content/*.json + content/**/*.mdx  ──vite build──▶  dist/public  ──▶  Cloudflare Pages
 (single source)     scripts/notion-content.mjs       (imported at build time)
```

- The frontend (`client/src/content/index.ts`) imports `content/*.json` and
  `content/**/*.mdx` at build time.
- `fetch:notion` regenerates those files from Notion. The committed `content/`
  is a seed/fallback for offline builds and is overwritten by fetch.
- See [docs/notion-cms.md](docs/notion-cms.md) for the database schema and
  property conventions.

## Stack

- Frontend: React, Vite, TypeScript, Wouter
- Content: Notion (`@notionhq/client` + `notion-to-md`)
- Validation: Zod (`client/src/content/schema.ts`)
- Deployment: Cloudflare Pages (static)
- i18n: `Locale=ko/en` rows in the same DB, joined by `Key` → `content/i18n/en.json`

## Local development

```bash
corepack enable
pnpm install

export NOTION_TOKEN=...     # PowerShell: $env:NOTION_TOKEN="..."
pnpm fetch:notion          # Notion -> content/
pnpm dev                   # http://localhost:3000
```

`pnpm dev` / `pnpm build` also work without `NOTION_TOKEN` using the committed
`content/` seed. Database ids have defaults baked into `scripts/notion-content.mjs`;
override them via `.env` only when targeting a different workspace.

## Verify

```bash
pnpm check        # tsc
pnpm test         # vitest (frontend)
pnpm test:notion  # node --test (fetch transform)
pnpm build        # dist/public
```

## Deploy

**Cloudflare Pages' GitHub integration handles deploys.** The `namuori-portfolio-cms`
Pages project is connected to this repo (production branch `main`, auto-deploy) and
builds with `pnpm build` (output `dist/public`) on every push to `main`. No Cloudflare
API token is required.

Content sync is handled by GitHub Actions: the `Sync content from Notion` workflow
(6-hourly schedule + manual dispatch) runs `pnpm fetch:notion` to regenerate
`content/` (and media under `client/public/notion/`), and commits any changes to
`main` — which triggers a Pages deploy. `content/` and `client/public/notion/` are
committed so the Pages `pnpm build` includes them.

Required GitHub secret/variable (run `pnpm check:notion` to audit):

```text
secret   NOTION_TOKEN     # read-only Notion integration token (used by the Action's fetch)
variable NOTION_ENTRIES_DB_ID # unified Portfolio Entries database id
variable NOTION_*_DB_ID       # legacy fallback database ids (defaults baked into code)
```
