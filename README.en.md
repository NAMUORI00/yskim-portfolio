# yskim Portfolio

[한국어 README](README.md)

A portfolio that uses **Notion as the single source of truth**. Notion is used
only for the section databases; GitHub Actions pulls that content and
builds/deploys the static site (`namuori.net`). Public portfolio rendering lives
on `namuori.net`, not on a separate Notion page.

The flow:

1. Edit content in the Notion `KYS — Portfolio (CMS)` workspace.
2. Set each item's `Status` to `Published`.
3. Write descriptions, bullets, skill items, project details, research pages, and notes inside the row page like a blog post.
4. `scripts/notion-content.mjs` regenerates `content/` (JSON + MDX) from Notion.
5. Vite builds the static site from `content/`.
6. Cloudflare Pages deploys it.

> The previous `/admin` flow (GitHub OAuth → draft branch → PR) has been removed.
> Editing now happens **only in Notion**.

## Architecture

```text
Notion category DBs ──fetch──▶  content/*.json + content/**/*.mdx  ──vite build──▶  dist/public  ──▶  Cloudflare Pages
 (section sources)   scripts/notion-content.mjs       (imported at build time)
```

- The frontend (`client/src/content/index.ts`) imports `content/*.json` and
  `content/**/*.mdx` at build time.
- `fetch:notion` regenerates those files from Notion. The committed `content/`
  is a seed/cache for offline builds and is overwritten by fetch.
- The databases intentionally use a thin schema: metadata stays in properties,
  while content-like fields such as `Summary`, `Bullets`, `Items`, and `Metric`
  can live in the row page body or be omitted when optional.
- See [docs/notion-cms.md](docs/notion-cms.md) for the database schema and
  property conventions.

## Stack

- Frontend: React, Vite, TypeScript, Wouter
- Content: Notion (`@notionhq/client` + `notion-to-md`)
- Validation: Zod (`client/src/content/schema.ts`)
- Deployment: Cloudflare Pages (static)
- i18n: `Locale=ko/en` rows inside each category DB, joined by `Key` → `content/i18n/en.json`

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
`content/` (and media under `client/public/notion/`). Any repository content changes are committed to `main`, which
triggers a Pages deploy. `content/` and `client/public/notion/` are committed so
the Pages `pnpm build` includes them.

Required GitHub secret/variable (run `pnpm check:notion` to audit):

```text
secret   NOTION_TOKEN       # Notion integration token for reading category DBs
variable NOTION_PROFILE_DB_ID
variable NOTION_INTRO_DB_ID
variable NOTION_CONTACTS_DB_ID
variable NOTION_TIMELINE_DB_ID
variable NOTION_RESEARCH_DB_ID
variable NOTION_PROJECTS_DB_ID
variable NOTION_SKILLS_DB_ID
variable NOTION_STARRED_DB_ID
variable NOTION_NOTES_DB_ID
variable NOTION_SITE_DB_ID
```

The Notion integration must be shared with the portfolio category databases and
needs read access to them.
