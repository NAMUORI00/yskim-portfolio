# Notion CMS Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `Portfolio Entries` as the single source of truth while making the Notion management experience cleaner and refreshing the public Notion rendering page without breaking the existing GitHub -> Cloudflare deploy path.

**Architecture:** Leave the production content pipeline intact: `Portfolio Entries` still feeds `scripts/notion-content.mjs` and the website build, and `scripts/notion-public-page.mjs` still regenerates the public Notion page. The implementation only adds tests, updates the public-page layout generator, documents the operational rules, and reconfigures the live Notion management page + views.

**Tech Stack:** Node.js ESM, Notion API (`@notionhq/client`), Node test runner, GitHub Actions, Cloudflare Pages, Notion MCP tools.

---

### Task 1: Add regression tests for the public Notion rendering layout

**Files:**
- Create: `C:\Users\yskim\projects\namuori-portfolio-cms\tests\notion-public-page.test.mjs`
- Modify: `C:\Users\yskim\projects\namuori-portfolio-cms\scripts\notion-public-page.mjs`

- [ ] **Step 1: Write the failing test**

Add tests that build a representative row set and assert the generated blocks contain:
- a two-paragraph hero
- the compact section headings
- selected work prioritizing highlighted projects
- a links section that includes notes + starred links

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test tests/notion-public-page.test.mjs`

Expected: FAIL because the current generator does not expose the helper or emit the new structure.

- [ ] **Step 3: Export the public-page block builder and implement the new layout**

Update `scripts/notion-public-page.mjs` so the public page becomes a quieter editorial snapshot:
- compact hero / contact / section-nav structure
- `Selected`, `Research`, `Systems`, `Timeline`, `Skills`, `Links`, `English`
- notes and starred links grouped together

- [ ] **Step 4: Run the new test again**

Run: `node --test tests/notion-public-page.test.mjs`

Expected: PASS

- [ ] **Step 5: Run the broader Notion content tests**

Run: `pnpm test:notion`

Expected: PASS

### Task 2: Update CMS documentation for the unified DB workflow

**Files:**
- Modify: `C:\Users\yskim\projects\namuori-portfolio-cms\docs\notion-cms.md`

- [ ] **Step 1: Document the management-home model**

Add a concise section describing:
- single DB remains canonical
- KO/EN are paired by `Key`
- management home is a dashboard, not a second content source

- [ ] **Step 2: Document the operational views**

Add the intended views:
- `All entries`
- `KO Editing`
- `EN Editing`
- `Drafts`
- `Highlights`
- `Public QA`

- [ ] **Step 3: Document the template convention**

Describe the section templates as content conventions:
- project / research / timeline / skills / contact / note
- suggested body skeleton for long-form sections

### Task 3: Apply the live Notion workspace cleanup

**Files / Surfaces:**
- Modify live Notion page: `C:\Users\yskim\projects\namuori-portfolio-cms\docs\notion-cms.md` (documentation reference only)
- Modify live Notion database/views:
  - page `포트폴리오` (`37fdcd44-779f-8161-827b-d4cc6615a7ab`)
  - database `Portfolio Entries` (`a15aff41-47f3-4a92-8dc8-a1367ae00a46`)

- [ ] **Step 1: Replace the management-home page content**

Turn the page into a compact dashboard with:
- short intro
- quick links to DB / public page / live site / workflow
- short editing rules
- template conventions

- [ ] **Step 2: Rename the existing language views**

Rename:
- `KO` -> `KO Editing`
- `EN` -> `EN Editing`

- [ ] **Step 3: Create focused operations views**

Create:
- `Drafts`
- `Highlights`
- `Public QA`

- [ ] **Step 4: Add linked views to the management page**

Append linked database views for the key editing lanes so the dashboard is directly usable.

### Task 4: Verify the end-to-end surfaces

**Files / Commands:**
- Verify scripts and tests locally
- Verify live Notion pages and Cloudflare state

- [ ] **Step 1: Run local verification**

Run:
- `node --test tests/notion-public-page.test.mjs`
- `pnpm test:notion`

- [ ] **Step 2: Live-check the management page**

Fetch the updated `포트폴리오` page and confirm:
- new dashboard copy is present
- DB link remains preserved
- linked editing views exist

- [ ] **Step 3: Live-check the public Notion page**

Fetch the updated public page and confirm:
- new section names are present
- selected work still renders from the DB
- English snapshot still exists

- [ ] **Step 4: Confirm deploy path still points at the same repo/project**

Verify:
- GitHub workflow still targets the same DB/page IDs
- Cloudflare Pages project still points to `NAMUORI00/yskim-portfolio`
