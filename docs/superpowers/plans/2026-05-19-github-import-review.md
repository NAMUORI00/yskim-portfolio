# GitHub Import Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a review-first GitHub import flow to `/admin` so GitHub project, skill, and starred repository candidates can be fetched, reviewed, applied, edited, and saved through the existing draft PR workflow.

**Architecture:** Keep persistence unchanged. Cloudflare Pages Functions fetch GitHub data and return neutral candidates; the React admin UI stores candidates locally and applies only approved items to existing editor state. Pure helpers handle parsing, mapping, dedupe, and merge behavior so they can be tested independently.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, Cloudflare Pages Functions, GitHub REST API.

---

### Task 1: Shared Admin Import Helpers

**Files:**
- Create: `client/src/lib/githubImport.ts`
- Test: `client/src/lib/githubImport.test.ts`

- [ ] **Step 1: Write failing tests**

Cover GitHub URL parsing, project candidate mapping, skill merge dedupe, and starred merge dedupe.

- [ ] **Step 2: Verify red**

Run: `pnpm vitest run client/src/lib/githubImport.test.ts`

Expected: fail because `client/src/lib/githubImport.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Create types and functions:

- `parseGitHubSource(source, mode)`
- `mergeProjectCandidate(projects, candidate)`
- `mergeSkillCandidates(skills, candidates)`
- `mergeStarredCandidates(starred, candidates)`
- `demoGitHubImportResponse`

- [ ] **Step 4: Verify green**

Run: `pnpm vitest run client/src/lib/githubImport.test.ts`

Expected: pass.

### Task 2: Cloudflare GitHub Import API

**Files:**
- Create: `functions/_utils/githubImport.js`
- Create: `functions/api/github/import.js`
- Test: `client/src/lib/githubImportFunction.test.ts`

- [ ] **Step 1: Write failing tests**

Cover server-side URL parsing, repo candidate conversion, compact stars, and generated body.

- [ ] **Step 2: Verify red**

Run: `pnpm vitest run client/src/lib/githubImportFunction.test.ts`

Expected: fail because the function utility does not exist.

- [ ] **Step 3: Implement server helper and endpoint**

Use existing `requireSession` and `githubFetch`. Fetch repository metadata, languages, README, user repos, and starred repositories. Return `{ source, owner, projects, skills, starred, warnings }`.

- [ ] **Step 4: Verify green**

Run: `pnpm vitest run client/src/lib/githubImportFunction.test.ts`

Expected: pass.

### Task 3: Admin Review UI

**Files:**
- Modify: `client/src/pages/Admin.tsx`

- [ ] **Step 1: Add import state and handlers**

Add source/mode/candidate/loading state. Use demo data in local preview, otherwise call `/api/github/import`.

- [ ] **Step 2: Render import panel**

Show the panel in Projects, Skills, and Starred sections. Each candidate has an Apply button. Applying only mutates local state.

- [ ] **Step 3: Preserve existing save flow**

Leave Save draft and Publish PR unchanged. Update status text after applying candidates.

### Task 4: Verification And Deployment

**Files:**
- No additional files.

- [ ] **Step 1: Run checks**

Run:

```bash
pnpm check
pnpm test
pnpm build
```

- [ ] **Step 2: Browser QA**

Use the in-app browser only. Verify `/admin?demo=1` can fetch demo candidates and apply Project, Skills, and Starred candidates.

- [ ] **Step 3: Commit, push, deploy**

Commit, push `main`, and deploy `dist/public` with Wrangler Pages.
