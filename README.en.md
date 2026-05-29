# Namuori Portfolio CMS

[한국어 README](README.md)

Namuori Portfolio CMS is a deployable portfolio system. The public website is rendered from files in `content/`, while `/admin` lets the owner edit that content and publish changes through GitHub Pull Requests.

The core idea is simple.

1. Portfolio content is stored as data in `content/`, not hard-coded into React components.
2. The owner edits content in `/admin`.
3. Saving writes changes to a GitHub `draft/...` branch.
4. Publishing creates or updates a Pull Request into `main`.
5. Cloudflare Pages builds previews and production deployments automatically.

## Principle Diagram

The diagram below summarizes how this repository stores content and moves it into production.

![Namuori Portfolio CMS principle diagram](docs/assets/portfolio-cms-principle.png)

The main flow is:

`content/` data moves through the `/admin` editor, becomes a GitHub branch and PR, and is then built by Cloudflare Pages into the public `namuori.net` site.

## Production URLs

- Public site: `https://namuori.net`
- Admin page: `https://namuori.net/admin`
- GitHub repository: `https://github.com/NAMUORI00/namuori-portfolio-cms`
- Cloudflare Pages project: `namuori-portfolio-cms`

## Technology Stack

- Frontend: React, Vite, TypeScript
- Content validation: Zod
- Styling: CSS, Tailwind-based utilities, Pretendard-first font stack
- Admin auth: GitHub OAuth, restricted to allowed GitHub users
- Write path: Cloudflare Pages Functions -> GitHub App -> draft branch
- Deployment: Cloudflare Pages
- Verification: TypeScript check, Vitest, production build

## Repository Structure

```text
content/
  site.json              # Site title, description, navigation, shared images
  profile.json           # Name, summary, contact links, profile status
  education.json         # Education, timeline, CV-like history
  research/*.mdx         # Research-interest entries
  projects/*.mdx         # Project entries
  skills.json            # Skill groups
  starred.json           # Starred or interesting repositories
  notes/*.mdx            # Detail notes and supporting documents

client/src/
  pages/Home.tsx         # Public portfolio page
  pages/Admin.tsx        # Admin editing page
  content/schema.ts      # Content validation rules

functions/api/
  auth/*                 # GitHub login
  github/save.js         # Save to a draft branch
  github/publish.js      # Create or update a publishing PR
  github/import.js       # Import GitHub candidates
  translate/en.js        # Generate English draft text
```

## Local Development

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install
pnpm dev
```

Local URLs:

- Portfolio: `http://localhost:3000/`
- Notes: `http://localhost:3000/notes`
- Demo admin: `http://localhost:3000/admin?demo=1`

`?demo=1` is only for local editor behavior checks. It does not write to GitHub or create Pull Requests.

## Content Publishing Flow

From the owner perspective:

1. Open `/admin`.
2. Log in with an allowed GitHub account.
3. Edit profile, timeline, research interests, projects, skills, starred repositories, or notes.
4. Use `Save draft` to write to a `draft/...` branch.
5. Use `Publish PR` to create a Pull Request targeting `main`.
6. Check the Cloudflare Pages preview linked from the PR.
7. Merge the PR to deploy to production.

## Korean and English Content

Korean is the source language. English content is generated as a draft from the Korean source and then manually refined by the owner.

- Korean source: `content/*.json`, `content/**/*.mdx`
- English translation: `content/i18n/en.json`
- Public page: KO/EN toggle
- Admin page: Korean and English content management in the same publishing flow

## Security Model

The admin page lives on the same public domain, but write operations require several checks.

- GitHub OAuth login
- User must be listed in `ADMIN_GITHUB_USERS`
- Signed session cookie verification
- Same-origin admin request header
- Only approved content paths can be saved
- Only `draft/...` branch names are accepted
- File count and file size limits
- Unsafe URLs such as `javascript:` are rejected
- Cloudflare `_headers` apply CSP, HSTS, frame blocking, and nosniff

## Cloudflare Pages Setup

Cloudflare Pages Git integration:

```text
Repository: NAMUORI00/namuori-portfolio-cms
Production branch: main
Build command: pnpm build
Build output directory: dist/public
Functions directory: functions
Preview branches: draft/* and feature/*
```

Required environment variables:

```text
ADMIN_GITHUB_USERS=NAMUORI00
GITHUB_APP_ID=<GitHub App ID>
GITHUB_APP_CLIENT_ID=<GitHub App client ID>
GITHUB_APP_CLIENT_SECRET=<GitHub App client secret>
GITHUB_APP_PRIVATE_KEY=<GitHub App private key, newline escaped or multiline secret>
GITHUB_APP_INSTALLATION_ID=<installation ID>
GITHUB_REPO_OWNER=NAMUORI00
GITHUB_REPO_NAME=namuori-portfolio-cms
SESSION_SECRET=<long random secret>
```

The GitHub App callback URL must include the production domain:

```text
https://namuori.net/api/auth/callback
```

If you also use the default Pages domain, add this callback format too:

```text
https://<project>.pages.dev/api/auth/callback
```

## Verification

Run these commands after regular changes:

```bash
pnpm check
pnpm test
pnpm build
```

For security-sensitive changes, also run:

```bash
pnpm audit --prod
```

Deployment is usually handled automatically by Cloudflare Pages after merging to `main`. Manual deployment is also possible with Wrangler.

```bash
npx wrangler pages deploy dist/public --project-name namuori-portfolio-cms --branch main
```
