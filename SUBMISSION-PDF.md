# Submission PDF studio

Open `/insights` through either home navigation contact area. The existing `content/profile.json`, `content/education.json`, project MDX and `PROJECT_INSIGHTS` are the source of truth. Public, non-private projects only are selectable.

## First version

- Separate resume/career-history and portfolio configurations.
- Rule-based purpose presets, inclusion/exclusion, keyboard-accessible ordering, editable introduction and summary/standard/detailed content levels.
- Browser-only A4 generation with locally hosted OFL Korean fonts, searchable text, links, automatic page wrapping and final page numbering.
- Actual PDF preview/download and a ZIP containing both PDFs. Native PDF preview depends on browser support; download/new-window links remain available.
- Lazy-load PDF libraries on generation. No service credentials, AI calls or server-side document storage.
- Changes invalidate previous previews. Fields are disabled during rendering; failed generation preserves editor state.
- Session-only edits; navigating away resets them. Saved submissions, English output and AI rewriting are outside this first version.

## Verification

Run `pnpm check`, `pnpm test`, `pnpm build`.

To export the two default examples from the real renderer test, set `SUBMISSION_OUTPUT_DIR` to an existing or new destination and run:

```
pnpm exec vitest run src/submission/SubmissionDocument.test.tsx
```

Set `SUBMISSION_STRESS_PATH` to a file path to also export the all-projects, long-introduction fixture. Default content currently produces 3 resume pages and 4 portfolio pages; all 17 public projects in detailed mode with the long introduction produce 23 pages. Counts change with source content.

PDF tests cover embedded fonts, links, A4 sizing, final pagination and all-project generation. Editor tests cover independent selections, reordering, stale preview invalidation, empty selections and errors. Visually inspect rendered PDFs whenever typography or layout changes.

The narrow `wasm-unsafe-eval` script directive permits the bundled Yoga PDF layout engine (general JavaScript `unsafe-eval` stays disabled). The `frame-src blob:` CSP addition permits local PDF previews; object embedding stays disabled. Fonts are bundled under `client/public/fonts` with their OFL license.
