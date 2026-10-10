# Kim Yuseok Portfolio

[Korean](README.md) | [Website namuori.net](https://namuori.net)

Source of my personal portfolio site, which brings together research, projects, skills, and a knowledge map. Content is managed in Git, and a push to `main` triggers Cloudflare Pages to build and deploy.

## Features

- Project and research pages written in MDX, with summaries and module flow diagrams
- Papers, education, experience, skills, and starred open-source projects
- Knowledge map by field
- Korean and English
- Daily sync of recent GitHub stars

## Stack

React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Vitest, GitHub Actions, Cloudflare Pages

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm check && pnpm test && pnpm build
```

The site builds from this repository alone, with no external CMS or API keys. See [docs/editing.md](docs/editing.md) (Korean) for content locations and deployment settings.
