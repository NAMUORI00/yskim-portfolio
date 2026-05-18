# Portfolio Git-backed CMS Design

Date: 2026-05-18

## Summary

Build a deployable portfolio site from the existing `namuori-portfolio.zip` source while preserving its minimal two-column CV visual language. The new site will include a same-origin `/admin` editor that lets the owner edit the full portfolio and publish notes. Content changes are saved as GitHub draft branches and published through pull requests. Cloudflare Pages provides production deployments from `main` and preview deployments for draft/PR branches.

The first implementation target is a new GitHub repository, default name `namuori-portfolio-cms`, under the `NAMUORI00` account. If that repository name already exists, stop and ask for the repo name instead of silently choosing another one.

## Goals

- Preserve the current academic CV + developer portfolio design: fixed sidebar, restrained typography, forest-green accent, and content-first layout.
- Move portfolio data out of `Home.tsx` into typed content files so the site can be edited without code changes.
- Add `/admin` inside the same Cloudflare Pages deployment.
- Authenticate admins with GitHub login and allow only configured GitHub usernames.
- Save drafts to GitHub branches such as `draft/profile`, `draft/project-aerospace-rag`, and `draft/note-2026-05-rag-evaluation`.
- Publish by creating or updating GitHub pull requests.
- Use Cloudflare Pages Git integration for automatic branch/PR preview deployments and production deploys from `main`.
- Support WYSIWYG editing, Markdown source editing, and live preview for long-form content.
- Support a public `/notes` area and related-note links from research/project pages.
- Provide light and dark themes with clear contrast and a 6:3:1 visual color ratio.

## Non-Goals

- Do not build a database-backed CMS in the first version.
- Do not allow anonymous or password-only admin access.
- Do not publish edits directly to production from `/admin`; production changes happen through PR merge.
- Do not introduce unrelated visual redesigns beyond theme, font, and accessibility improvements needed for readability.

## Current State

The extracted source is a Vite + React + TypeScript app. The main portfolio content, theme tokens, SVG icons, and page layout are mostly concentrated in `client/src/pages/Home.tsx`. The repo also includes a small Express static server, shadcn/Radix UI components, Tailwind CSS, `wouter`, `framer-motion`, and existing light/dark theme context.

This design keeps the visual behavior of `Home.tsx` but splits it into:

- typed content models,
- reusable portfolio render components,
- admin editor routes,
- serverless API functions for authentication and GitHub operations.

## Architecture

### Public Site

Routes:

- `/`: portfolio homepage with introduction, education, research, projects, skills, and starred repositories.
- `/projects/:slug`: project detail page rendered from project MDX.
- `/research/:slug`: research interest detail page rendered from research MDX.
- `/notes`: public note index.
- `/notes/:slug`: note detail page rendered from MDX.

The public site reads `content/` at build time. Build-time validation fails the build if content is malformed.

### Admin Site

Route:

- `/admin`: authenticated editor application.

Admin sections:

- `Profile`: name, headline, summary, contact links, hero image, profile metadata.
- `Timeline`: education and career entries.
- `Research`: research interest frontmatter and MDX body.
- `Projects`: project frontmatter, metrics, links, tags, related notes, and MDX body.
- `Skills`: grouped skills and labels.
- `Starred`: curated repository list.
- `Notes`: note frontmatter, body, publication status, and related project/research links.

The admin interface should feel like a quiet operational tool, not a marketing page. It should use dense, predictable tabs, forms, list/detail panels, and editor panes.

### Serverless API

Cloudflare Pages Functions live under `functions/api/*` and handle:

- GitHub login callback and session creation.
- Session validation for `/admin`.
- Allowed username checks.
- Reading repository content through GitHub APIs.
- Creating draft branches.
- Writing content files to branches.
- Creating or updating pull requests.
- Returning PR and preview-deployment status metadata when available.

The client never receives GitHub App private keys, OAuth client secrets, or long-lived installation credentials.

## Content Model

Proposed content tree:

```text
content/
  site.json
  profile.json
  education.json
  research/
    rag.mdx
    edge-llm.mdx
  projects/
    aerospace-rag.mdx
    cross-review-bridge.mdx
  skills.json
  starred.json
  notes/
    2026-05-rag-evaluation.mdx
assets/
  hero.webp
  diagrams/
```

JSON files are used for structured global lists. MDX files are used when an item needs rich body content.

Each MDX file has frontmatter validated with Zod. Required fields include `title`, `slug`, `status`, and type-specific fields such as `period`, `tags`, `links`, `metric`, `relatedProjects`, or `relatedResearch`.

Publication statuses:

- `draft`: editable and saved to a draft branch, hidden from production output.
- `published`: visible after PR merge to `main`.
- `archived`: hidden from main lists but still renderable if linked intentionally.

## Editor UX

Long-form editor behavior:

- Default mode: WYSIWYG editor for comfortable writing.
- Source mode: Markdown/MDX text editing.
- Preview mode: live rendered preview using the same components as the public site where practical.

Save actions:

- `Save draft`: validates content and commits to the appropriate `draft/...` branch.
- `Publish`: opens or updates a PR from the draft branch to `main`.
- `Open PR`: opens the GitHub PR.
- `Open preview`: opens the Cloudflare Pages preview URL when available.

Admin status bar:

- current GitHub user,
- current branch,
- last saved commit,
- validation state,
- PR link,
- preview URL,
- unsaved changes state.

## Theme And Accessibility

Use a 6:3:1 color composition:

- 60% base/background,
- 30% surface/content regions,
- 10% accent/action color.

Token names:

- `base`,
- `surface`,
- `surfaceRaised`,
- `text`,
- `subtext`,
- `muted`,
- `border`,
- `accent`,
- `accentSoft`,
- `accentText`,
- `danger`.

Light mode should keep the current calm off-white base and forest-green accent. Dark mode should use separated base/surface tones so cards, lists, inputs, and body text do not blur together.

Readability rules:

- Body text, links, buttons, inputs, nav items, and tags must pass contrast checks in both themes.
- Muted text must not be used for primary content.
- Disabled controls must remain distinguishable from low-emphasis active content.
- Text must not overlap or overflow controls on mobile or desktop.

Font stack:

```css
font-family:
  "Nanum Gothic",
  "Pretendard",
  "Apple SD Gothic Neo",
  "Noto Sans KR",
  system-ui,
  sans-serif;
```

Code, dates, numeric metadata, and skill tags keep a monospace stack such as `JetBrains Mono`, `Fira Code`, or system monospace.

## GitHub Workflow

Use a GitHub App user authorization flow for admin access and GitHub API operations.

GitHub App model:

- GitHub App with user authorization enabled.
- Required repository access: contents read/write and pull requests read/write.
- Allowed admins are configured through an environment variable such as `ADMIN_GITHUB_USERS=NAMUORI00`.
- The implementation must start with the GitHub App flow. Do not switch to a plain OAuth App unless GitHub App setup is explicitly blocked and the user approves the fallback.

Draft branch rules:

- Profile edits use `draft/profile`.
- Project edits use `draft/project-<slug>`.
- Research edits use `draft/research-<slug>`.
- Note edits use `draft/note-<slug>`.
- If a draft branch exists, update it.
- If a matching open PR exists, update that PR rather than creating duplicates.

GitHub API usage:

- Use Git references APIs to create branch refs when needed.
- Use repository contents or Git database APIs to commit file changes.
- Use pull request APIs to create/update PRs.

Related references:

- GitHub pull request REST API: https://docs.github.com/en/rest/pulls
- GitHub repository contents REST API: https://docs.github.com/en/rest/repos/contents
- GitHub Git references REST API: https://docs.github.com/en/rest/git/refs
- GitHub App permissions guidance: https://docs.github.com/developers/apps/building-github-apps/setting-permissions-for-github-apps

## Cloudflare Deployment

Use Cloudflare Pages Git integration, not Direct Upload, for the first deployment model.

Build settings:

```text
Build command: pnpm build
Build output directory: dist/public
Production branch: main
Preview branches: draft/* and feature/*
Functions directory: functions/
```

Cloudflare Pages Git integration provides deployments on branch push, PR preview URLs, and GitHub status checks. Pages Functions provide the `/api/*` backend for authentication and GitHub operations.

Required environment variables:

- `ADMIN_GITHUB_USERS`
- `GITHUB_APP_ID`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `SESSION_SECRET`

References:

- Cloudflare Pages Git integration: https://developers.cloudflare.com/pages/configuration/git-integration/
- Cloudflare Pages preview deployments: https://developers.cloudflare.com/pages/configuration/preview-deployments/
- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/

## Error Handling

Validation errors:

- Show field-level messages.
- Do not commit invalid content.

GitHub failures:

- Show whether the failure is auth, permission, branch conflict, commit failure, rate limit, or PR failure.
- Preserve unsaved editor state in the browser until the user retries or intentionally discards it.

Branch conflicts:

- Show the changed files and offer to reload from branch, retry save, or create a new draft branch.

Cloudflare preview delays:

- Show PR link immediately.
- Poll or refresh preview status opportunistically.
- Do not block PR creation on preview URL availability.

## Testing Strategy

Static checks:

- `pnpm check`
- content schema validation
- MDX parsing and build validation

Unit tests:

- content schema parsing,
- slug generation,
- branch-name generation,
- GitHub API wrapper request shaping,
- theme token contrast tests.

Integration tests:

- admin auth guard,
- save draft flow against mocked GitHub API,
- publish PR flow against mocked GitHub API,
- public route rendering from fixture content.

Visual QA:

- desktop and mobile screenshots for light and dark mode,
- public homepage,
- note detail,
- project detail,
- `/admin` list and editor screens,
- checks for blank screens, overlapping text, unreadable muted text, and broken responsive layouts.

Manual deployment QA:

- create new GitHub repo,
- push initial implementation,
- connect Cloudflare Pages through Git integration,
- verify production deployment from `main`,
- create a draft edit from `/admin`,
- verify draft branch commit,
- verify PR creation,
- verify Cloudflare preview URL,
- merge PR,
- verify production update.

## Rollout Plan

1. Refactor the existing portfolio into content models and renderer components.
2. Add the theme token system, Nanum Gothic font stack, and contrast-safe light/dark mode.
3. Add `/notes` and MDX rendering.
4. Add `/admin` shell, auth guard, and editor navigation.
5. Add content editing forms and WYSIWYG/Markdown editor.
6. Add Pages Functions for GitHub auth and repository operations.
7. Add draft branch save and PR publish flows.
8. Add tests and visual QA.
9. Initialize the new GitHub repository and push the project.
10. Connect Cloudflare Pages Git integration and verify production/preview deployments.

## Acceptance Criteria

- Public portfolio renders from `content/` rather than hardcoded arrays in `Home.tsx`.
- Existing visual identity is recognizable after refactor.
- Light and dark modes have readable body text, controls, tags, nav, and editor content.
- `/admin` requires GitHub login and rejects non-allowed usernames.
- Admin can edit full portfolio content and notes.
- Saving creates or updates the expected `draft/...` branch.
- Publishing creates or updates a PR.
- Cloudflare Pages creates a preview for the PR branch and production updates after merge.
- `pnpm check`, tests, and `pnpm build` pass.
- Browser QA confirms no blank, overlapping, or illegible main screens on desktop and mobile.
