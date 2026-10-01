# Kim Yuseok Portfolio

[Korean](README.md) · [Website](https://namuori.net)

All content, assets and UI code are managed in this Git repository. A push to `main` triggers the existing Cloudflare Pages GitHub integration.

Edit the JSON files in `content/` and MDX files in `content/research`, `content/projects` and `content/notes`. Keep English translations in `content/i18n/en.json` in sync. Store assets in `client/public`. The expanded project details (summary, comparison, modules) are in `client/src/components/capabilities/projectInsights.ts`, and their module-flow diagrams in the `capability*.ts` files beside it.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm build
```

Pages project: `namuori-portfolio-cms`; production branch: `main`; build: `pnpm build`; output: `dist/public`. GitHub Actions validates changes; Pages deploys independently, so run checks before pushing.

No CMS token is required. Notion sync and the media proxy were removed on 2026-10-01. The portfolio CMS page and its child databases were exported in full and moved to Trash. Notion blog pages remain unchanged. The repository Notion token and database variables were removed. Repository content is the source of truth, not a generated cache.

## Recent stars refresh

The workflow refreshes the six most recently starred public repositories daily at 22:23 UTC (scheduling may be delayed), validates changes and commits only an updated list. Cloudflare deploys main. API failures preserve the previous list. No personal token or private repositories are used. Run Update recent GitHub stars manually in Actions when needed.
